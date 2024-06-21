import React, {useMemo} from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import Section from '@components/Section';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import DateUtils from '@libs/DateUtils';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import SubscriptionBillingBanner from './BillingBanner/SubscriptionBillingBanner';
import CardSectionActions from './CardSectionActions';
import CardSectionDataEmpty from './CardSectionDataEmpty';
import CardSectionUtils from './utils';

function CardSection() {
    const {translate, preferredLocale} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();

    const defaultCard = CardSectionUtils.getCardForSubscriptionBilling();

    const cardMonth = useMemo(() => DateUtils.getMonthNames(preferredLocale)[(defaultCard?.accountData?.cardMonth ?? 1) - 1], [defaultCard?.accountData?.cardMonth, preferredLocale]);

    const {title, subtitle, isError, icon, rightIcon} = CardSectionUtils.getBillingStatus(translate, defaultCard?.accountData?.cardNumber ?? '');

    const shouldShowBanner = !!title || !!subtitle;

    return (
        <Section
            title={translate('subscription.cardSection.title')}
            subtitle={translate('subscription.cardSection.subtitle')}
            isCentralPane
            titleStyles={styles.textStrong}
            subtitleMuted
            banner={
                shouldShowBanner && (
                    <SubscriptionBillingBanner
                        title={title}
                        subtitle={subtitle}
                        isTrialActive={false}
                        isError={isError}
                        icon={icon}
                        rightIcon={rightIcon}
                    />
                )
            }
        >
            <View style={[styles.mt8, styles.mb3, styles.flexRow]}>
                {!isEmptyObject(defaultCard?.accountData) && (
                    <>
                        <View style={[styles.flexRow, styles.flex1, styles.gap3]}>
                            <Icon
                                src={Expensicons.CreditCard}
                                additionalStyles={styles.subscriptionAddedCardIcon}
                                fill={theme.text}
                                medium
                            />
                            <View style={styles.flex1}>
                                <Text style={styles.textStrong}>{translate('subscription.cardSection.cardEnding', {cardNumber: defaultCard?.accountData?.cardNumber})}</Text>
                                <Text style={styles.mutedNormalTextLabel}>
                                    {translate('subscription.cardSection.cardInfo', {
                                        name: defaultCard?.accountData?.addressName,
                                        expiration: `${cardMonth} ${defaultCard?.accountData?.cardYear}`,
                                        currency: defaultCard?.accountData?.currency,
                                    })}
                                </Text>
                            </View>
                        </View>
                        <CardSectionActions />
                    </>
                )}
                {isEmptyObject(defaultCard?.accountData) && <CardSectionDataEmpty />}
            </View>
        </Section>
    );
}

CardSection.displayName = 'CardSection';

export default CardSection;
