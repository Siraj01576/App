import React, {useMemo} from 'react';
import {View} from 'react-native';
import ConnectionLayout from '@components/ConnectionLayout';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import useWaitForNavigation from '@hooks/useWaitForNavigation';
import * as Connections from '@libs/actions/connections';
import * as QuickbooksOnline from '@libs/actions/connections/QuickbooksOnline';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as PolicyUtils from '@libs/PolicyUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {clearQBOErrorField} from '@userActions/Policy/Policy';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

const reimbursementOrCollectionAccountIDs = [CONST.QUICKBOOKS_CONFIG.REIMBURSEMENT_ACCOUNT_ID, CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID];
const collectionAccountIDs = [CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID];

function QuickbooksAdvancedPage({policy}: WithPolicyConnectionsProps) {
    const styles = useThemeStyles();
    const waitForNavigate = useWaitForNavigation();
    const {translate} = useLocalize();

    const policyID = policy?.id ?? '-1';
    const qboConfig = policy?.connections?.quickbooksOnline?.config;
    const {bankAccounts, creditCards, otherCurrentAssetAccounts} = policy?.connections?.quickbooksOnline?.data ?? {};

    const qboAccountOptions = useMemo(() => [...(bankAccounts ?? []), ...(creditCards ?? [])], [bankAccounts, creditCards]);
    const invoiceAccountCollectionOptions = useMemo(() => [...(bankAccounts ?? []), ...(otherCurrentAssetAccounts ?? [])], [bankAccounts, otherCurrentAssetAccounts]);

    const isSyncReimbursedSwitchOn = !!qboConfig?.collectionAccountID;

    const reimbursementAccountID = qboConfig?.reimbursementAccountID;
    const selectedQboAccountName = useMemo(() => qboAccountOptions?.find(({id}) => id === reimbursementAccountID)?.name, [qboAccountOptions, reimbursementAccountID]);
    const collectionAccountID = qboConfig?.collectionAccountID;

    const selectedInvoiceCollectionAccountName = useMemo(
        () => invoiceAccountCollectionOptions?.find(({id}) => id === collectionAccountID)?.name,
        [invoiceAccountCollectionOptions, collectionAccountID],
    );

    const sectionMenuItems = [
        {
            title: selectedQboAccountName,
            description: translate('workspace.qbo.advancedConfig.qboBillPaymentAccount'),
            onPress: waitForNavigate(() => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_QUICKBOOKS_ONLINE_ACCOUNT_SELECTOR.getRoute(policyID))),
            subscribedSettings: reimbursementOrCollectionAccountIDs,
            brickRoadIndicator: PolicyUtils.areSettingsInErrorFields(reimbursementOrCollectionAccountIDs, qboConfig?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
            pendingAction: PolicyUtils.settingsPendingAction(reimbursementOrCollectionAccountIDs, qboConfig?.pendingFields),
        },
        {
            title: selectedInvoiceCollectionAccountName,
            description: translate('workspace.qbo.advancedConfig.qboInvoiceCollectionAccount'),
            onPress: waitForNavigate(() => Navigation.navigate(ROUTES.WORKSPACE_ACCOUNTING_QUICKBOOKS_ONLINE_INVOICE_ACCOUNT_SELECTOR.getRoute(policyID))),
            subscribedSettings: collectionAccountIDs,
            brickRoadIndicator: PolicyUtils.areSettingsInErrorFields(collectionAccountIDs, qboConfig?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
            pendingAction: PolicyUtils.settingsPendingAction(collectionAccountIDs, qboConfig?.pendingFields),
        },
    ];

    const syncReimbursedSubMenuItems = () => (
        <View style={[styles.mt3]}>
            {sectionMenuItems.map((item) => (
                <OfflineWithFeedback pendingAction={item.pendingAction}>
                    <MenuItemWithTopDescription
                        shouldShowRightIcon
                        title={item.title}
                        description={item.description}
                        wrapperStyle={[styles.sectionMenuItemTopDescription]}
                        onPress={item.onPress}
                        brickRoadIndicator={item.brickRoadIndicator}
                    />
                </OfflineWithFeedback>
            ))}
        </View>
    );

    const qboToggleSettingItems = [
        {
            title: translate('workspace.accounting.autoSync'),
            subtitle: translate('workspace.qbo.advancedConfig.autoSyncDescription'),
            switchAccessibilityLabel: translate('workspace.qbo.advancedConfig.autoSyncDescription'),
            isActive: !!qboConfig?.autoSync?.enabled,
            onToggle: () =>
                Connections.updatePolicyConnectionConfig(
                    policyID,
                    CONST.POLICY.CONNECTIONS.NAME.QBO,
                    CONST.QUICKBOOKS_CONFIG.AUTO_SYNC,
                    {
                        enabled: !qboConfig?.autoSync?.enabled,
                    },
                    {
                        enabled: qboConfig?.autoSync?.enabled,
                    },
                ),
            subscribedSetting: CONST.QUICKBOOKS_CONFIG.ENABLED,
            errors: ErrorUtils.getLatestErrorField(qboConfig, CONST.QUICKBOOKS_CONFIG.ENABLED),
            pendingAction: settingsPendingAction([CONST.QUICKBOOKS_CONFIG.ENABLED], qboConfig?.pendingFields),
        },
        {
            title: translate('workspace.qbo.advancedConfig.inviteEmployees'),
            subtitle: translate('workspace.qbo.advancedConfig.inviteEmployeesDescription'),
            switchAccessibilityLabel: translate('workspace.qbo.advancedConfig.inviteEmployeesDescription'),
            isActive: !!qboConfig?.syncPeople,
            onToggle: () =>
                Connections.updatePolicyConnectionConfig(policyID, CONST.POLICY.CONNECTIONS.NAME.QBO, CONST.QUICKBOOKS_CONFIG.SYNC_PEOPLE, !qboConfig?.syncPeople, qboConfig?.syncPeople),
            subscribedSetting: CONST.QUICKBOOKS_CONFIG.SYNC_PEOPLE,
            errors: ErrorUtils.getLatestErrorField(qboConfig, CONST.QUICKBOOKS_CONFIG.SYNC_PEOPLE),
            pendingAction: settingsPendingAction([CONST.QUICKBOOKS_CONFIG.SYNC_PEOPLE], qboConfig?.pendingFields),
        },
        {
            title: translate('workspace.qbo.advancedConfig.createEntities'),
            subtitle: translate('workspace.qbo.advancedConfig.createEntitiesDescription'),
            switchAccessibilityLabel: translate('workspace.qbo.advancedConfig.createEntitiesDescription'),
            isActive: !!qboConfig?.autoCreateVendor,
            onToggle: () => QuickbooksOnline.updateQuickbooksOnlineAutoCreateVendor(policyID, !qboConfig?.autoCreateVendor),
            subscribedSetting: CONST.QUICKBOOKS_CONFIG.AUTO_CREATE_VENDOR,
            errors: ErrorUtils.getLatestErrorField(qboConfig, CONST.QUICKBOOKS_CONFIG.AUTO_CREATE_VENDOR),
            pendingAction: settingsPendingAction([CONST.QUICKBOOKS_CONFIG.AUTO_CREATE_VENDOR], qboConfig?.pendingFields),
        },
        {
            title: translate('workspace.accounting.reimbursedReports'),
            subtitle: translate('workspace.qbo.advancedConfig.reimbursedReportsDescription'),
            switchAccessibilityLabel: translate('workspace.qbo.advancedConfig.reimbursedReportsDescription'),
            isActive: isSyncReimbursedSwitchOn,
            onToggle: () =>
                Connections.updatePolicyConnectionConfig(
                    policyID,
                    CONST.POLICY.CONNECTIONS.NAME.QBO,
                    CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID,
                    isSyncReimbursedSwitchOn ? '' : [...qboAccountOptions, ...invoiceAccountCollectionOptions][0].id,
                    qboConfig?.collectionAccountID,
                ),
            subscribedSetting: CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID,
            errors: ErrorUtils.getLatestErrorField(qboConfig, CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID),
            pendingAction: settingsPendingAction([CONST.QUICKBOOKS_CONFIG.COLLECTION_ACCOUNT_ID], qboConfig?.pendingFields),
        },
    ];

    return (
        <ConnectionLayout
            displayName={QuickbooksAdvancedPage.displayName}
            headerTitle="workspace.accounting.advanced"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={[styles.pb2, styles.ph5]}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.QBO}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING.getRoute(policyID))}
        >
            {qboToggleSettingItems.map((item) => (
                <ToggleSettingOptionRow
                    key={item.title}
                    title={item.title}
                    subtitle={item.subtitle}
                    switchAccessibilityLabel={item.switchAccessibilityLabel}
                    shouldPlaceSubtitleBelowSwitch
                    wrapperStyle={styles.mv3}
                    isActive={item.isActive}
                    onToggle={item.onToggle}
                    pendingAction={item.pendingAction}
                    errors={item.errors}
                    onCloseError={() => clearQBOErrorField(policyID, item.subscribedSetting)}
                />
            ))}
            {isSyncReimbursedSwitchOn && syncReimbursedSubMenuItems()}
        </ConnectionLayout>
    );
}

QuickbooksAdvancedPage.displayName = 'QuickbooksAdvancedPage';

export default withPolicyConnections(QuickbooksAdvancedPage);
