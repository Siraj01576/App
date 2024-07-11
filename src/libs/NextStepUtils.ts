import {format, lastDayOfMonth, setDate} from 'date-fns';
import {Str} from 'expensify-common';
import Onyx from 'react-native-onyx';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, ReportNextStep} from '@src/types/onyx';
import type {Message} from '@src/types/onyx/ReportNextStep';
import type DeepValueOf from '@src/types/utils/DeepValueOf';
import DateUtils from './DateUtils';
import EmailUtils from './EmailUtils';
import * as PolicyUtils from './PolicyUtils';
import * as ReportUtils from './ReportUtils';

let currentUserAccountID = -1;
let currentUserEmail = '';
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        if (!value) {
            return;
        }

        currentUserAccountID = value?.accountID ?? -1;
        currentUserEmail = value?.email ?? '';
    },
});

let allPolicies: OnyxCollection<Policy>;
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY,
    waitForCollectionCallback: true,
    callback: (value) => (allPolicies = value),
});

function parseMessage(messages: Message[] | undefined) {
    let nextStepHTML = '';

    messages?.forEach((part) => {
        const isEmail = Str.isValidEmail(part.text);
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        let tagType = part.type ?? 'span';
        let content = Str.safeEscape(part.text);

        if (isEmail) {
            tagType = 'next-step-email';
            content = EmailUtils.prefixMailSeparatorsWithBreakOpportunities(content);
        }

        nextStepHTML += `<${tagType}>${content}</${tagType}>`;
    });

    const formattedHtml = nextStepHTML
        .replace(/%expenses/g, 'expense(s)')
        .replace(/%Expenses/g, 'Expense(s)')
        .replace(/%tobe/g, 'are');

    return `<next-step>${formattedHtml}</next-step>`;
}

/**
 * Generates an optimistic nextStep based on a current report status and other properties.
 *
 * @param report
 * @param predictedNextStatus - a next expected status of the report
 * @param parameters.isPaidWithExpensify - Whether a report has been paid with Expensify or outside
 * @returns nextStep
 */
function buildNextStep(report: OnyxEntry<Report>, predictedNextStatus: ValueOf<typeof CONST.REPORT.STATUS_NUM>): ReportNextStep | null {
    if (!ReportUtils.isExpenseReport(report)) {
        return null;
    }

    const {policyID = '', ownerAccountID = -1} = report ?? {};
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`] ?? ({} as Policy);
    const {harvesting, preventSelfApproval, autoReportingFrequency, autoReportingOffset} = policy;
    const submitToAccountID = PolicyUtils.getSubmitToAccountID(policy, ownerAccountID);
    const isSelfApproval = currentUserAccountID === submitToAccountID;
    const ownerDisplayName = ReportUtils.getDisplayNameForParticipant(ownerAccountID);
    const managerDisplayName = ReportUtils.getDisplayNameForParticipant(submitToAccountID);
    const reimburserAccountID = PolicyUtils.getReimburserAccountID(policy);
    const reimburserDisplayName = ReportUtils.getDisplayNameForParticipant(reimburserAccountID);
    const type: ReportNextStep['type'] = 'neutral';
    let optimisticNextStep: ReportNextStep | null;

    switch (predictedNextStatus) {
        // Generates an optimistic nextStep once a report has been opened
        case CONST.REPORT.STATUS_NUM.OPEN:
            // Self review
            optimisticNextStep = {
                type,
                title: 'Next Steps:',
                message: [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: 'you',
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'submit',
                        type: 'strong',
                    },
                    {
                        text: ' these expenses.',
                    },
                ],
            };

            // Scheduled submit enabled
            if (harvesting?.enabled && autoReportingFrequency !== CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL) {
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `${ownerDisplayName} `,
                        type: 'strong',
                    },
                    {
                        text: '%expense to',
                    },
                ];
                let harvestingSuffix = '';

                if (autoReportingFrequency) {
                    const currentDate = new Date();
                    let autoSubmissionDate: Date | null = null;
                    let formattedDate = '';

                    if (autoReportingOffset === CONST.POLICY.AUTO_REPORTING_OFFSET.LAST_DAY_OF_MONTH) {
                        autoSubmissionDate = lastDayOfMonth(currentDate);
                    } else if (autoReportingOffset === CONST.POLICY.AUTO_REPORTING_OFFSET.LAST_BUSINESS_DAY_OF_MONTH) {
                        const lastBusinessDayOfMonth = DateUtils.getLastBusinessDayOfMonth(currentDate);
                        autoSubmissionDate = setDate(currentDate, lastBusinessDayOfMonth);
                    } else if (autoReportingOffset !== undefined) {
                        autoSubmissionDate = setDate(currentDate, autoReportingOffset);
                    }

                    if (autoSubmissionDate) {
                        formattedDate = format(autoSubmissionDate, CONST.DATE.ORDINAL_DAY_OF_MONTH);
                    }

                    const harvestingSuffixes: Record<DeepValueOf<typeof CONST.POLICY.AUTO_REPORTING_FREQUENCIES>, string> = {
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.IMMEDIATE]: 'later today',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.WEEKLY]: 'on Sunday',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.SEMI_MONTHLY]: 'on the 1st and 16th of each month',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY]: formattedDate ? `on the ${formattedDate} of each month` : '',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.TRIP]: 'at the end of their trip',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.INSTANT]: '',
                        [CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL]: '',
                    };

                    if (harvestingSuffixes[autoReportingFrequency]) {
                        harvestingSuffix = ` ${harvestingSuffixes[autoReportingFrequency]}`;
                    }
                }

                optimisticNextStep.message.push({
                    text: `automatically submit${harvestingSuffix}`,
                    type: 'strong',
                });
            }

            // Prevented self submitting
            if (preventSelfApproval && isSelfApproval) {
                optimisticNextStep.message = [
                    {
                        text: "Oops! Looks like you're submitting to ",
                    },
                    {
                        text: 'yourself',
                        type: 'strong',
                    },
                    {
                        text: '. Approving your own reports is ',
                    },
                    {
                        text: 'forbidden',
                        type: 'strong',
                    },
                    {
                        text: ' by your policy. Please submit this report to someone else or contact your admin to change the person you submit to.',
                    },
                ];
            }

            break;

        // Generates an optimistic nextStep once a report has been submitted
        case CONST.REPORT.STATUS_NUM.SUBMITTED: {
            // Another owner
            optimisticNextStep = {
                type,
                title: 'Next Steps:',
                message: [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: managerDisplayName,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'approve',
                        type: 'strong',
                    },
                    {
                        text: ' %expense.',
                    },
                ],
            };

            break;
        }

        // Generates an optimistic nextStep once a report has been closed for example in the case of Submit and Close approval flow
        case CONST.REPORT.STATUS_NUM.CLOSED:
            optimisticNextStep = {
                type,
                title: 'Finished!',
                message: [
                    {
                        text: 'No further action required.',
                    },
                ],
            };

            break;

        // Generates an optimistic nextStep once a report has been approved
        case CONST.REPORT.STATUS_NUM.APPROVED:
            if (
                ReportUtils.isInvoiceReport(report) ||
                !ReportUtils.isPayer(
                    {
                        accountID: currentUserAccountID,
                        email: currentUserEmail,
                    },
                    report,
                )
            ) {
                optimisticNextStep = {
                    type,
                    title: 'Finished!',
                    message: [
                        {
                            text: 'No further action required.',
                        },
                    ],
                };
                break;
            }
            // Self review
            optimisticNextStep = {
                type,
                title: 'Next Steps:',
                message: [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: reimburserDisplayName,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'pay',
                        type: 'strong',
                    },
                    {
                        text: ' %expense.',
                    },
                ],
            };
            break;

        // Generates an optimistic nextStep once a report has been paid
        case CONST.REPORT.STATUS_NUM.REIMBURSED:
            // Paid with wallet
            optimisticNextStep = {
                type,
                title: 'Finished!',
                message: [
                    {
                        text: 'No further action required.',
                    },
                ],
            };

            break;

        // Resets a nextStep
        default:
            optimisticNextStep = null;
    }

    return optimisticNextStep;
}

export {parseMessage, buildNextStep};
