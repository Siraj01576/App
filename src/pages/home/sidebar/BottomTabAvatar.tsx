import React, {useCallback} from 'react';
import {useOnyx} from 'react-native-onyx';
import {PressableWithFeedback} from '@components/Pressable';
import Tooltip from '@components/Tooltip';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import AvatarWithDelegateAvatar from './AvatarWithDelegateAvatar';
import AvatarWithOptionalStatus from './AvatarWithOptionalStatus';
import ProfileAvatarWithIndicator from './ProfileAvatarWithIndicator';

type BottomTabAvatarProps = {
    /** Whether the create menu is open or not */
    isCreateMenuOpen?: boolean;

    /** Whether the avatar is selected */
    isSelected?: boolean;
};

function BottomTabAvatar({isCreateMenuOpen = false, isSelected = false}: BottomTabAvatarProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const delegateEmail = account?.delegatedAccess?.delegate ?? '';
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const emojiStatus = currentUserPersonalDetails?.status?.emojiCode ?? '';

    const showSettingsPage = useCallback(() => {
        if (isCreateMenuOpen) {
            // Prevent opening Settings page when click profile avatar quickly after clicking FAB icon
            return;
        }

        interceptAnonymousUser(() => Navigation.navigate(ROUTES.SETTINGS));
    }, [isCreateMenuOpen]);

    let children;

    if (delegateEmail) {
        children = (
            <AvatarWithDelegateAvatar
                delegateEmail={delegateEmail}
                isSelected={isSelected}
            />
        );
    }

    if (emojiStatus) {
        children = (
            <AvatarWithOptionalStatus
                emojiStatus={emojiStatus}
                isSelected={isSelected}
            />
        );
    } else {
        children = <ProfileAvatarWithIndicator isSelected={isSelected} />;
    }

    return (
        <Tooltip text={translate('initialSettingsPage.accountSettings')}>
            <PressableWithFeedback
                onPress={showSettingsPage}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={translate('sidebarScreen.buttonMySettings')}
                wrapperStyle={styles.flex1}
                style={styles.bottomTabBarItem}
            >
                {children}
            </PressableWithFeedback>
        </Tooltip>
    );
}

BottomTabAvatar.displayName = 'BottomTabAvatar';
export default BottomTabAvatar;
