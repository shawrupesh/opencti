import React, { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom-v5-compat';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';

import { useFormatter } from '../../../../components/i18n';
import { RootSettings$data } from '../../../__generated__/RootSettings.graphql';
import Transition from '../../../../components/Transition';
import useGranted, { SETTINGS_SETACCESSES } from '../../../../utils/hooks/useGranted';

type PlatformCriticalAlertBannerProps = {
  alerts: RootSettings$data['platform_critical_alerts']
};

const PlatformCriticalAlertBanner: React.FC<PlatformCriticalAlertBannerProps> = ({ alerts }) => {
  const { t_i18n } = useFormatter();
  const navigate = useNavigate();
  const hasSetAccesses = useGranted([SETTINGS_SETACCESSES]);

  const [open, setOpen] = useState<boolean>(alerts.length > 0);

  // we only display the first alert if any.
  // if (alerts.length > 0) {
  const alert = alerts[0];
  const users = (alert?.details?.users ?? []);
  const usersExcerpt = users.slice(0, 5);
  const restCount = Math.max(0, users.length - 5);

  const goToSettingsHandler = () => {
    setOpen(false);
    switch (alert.type) {
      case 'USER_WITH_NULL_EFFECTIVE_LEVEL': {
        navigate('/dashboard/settings/accesses/users');
        break;
      }
      default:
        navigate('/dashboard/settings');
    }
  };
  const closeHandler = () => {
    setOpen(false);
  };

  // this shall only be visible to admins of the platform
  if (!hasSetAccesses) {
    return null;
  }

  return (
    <Dialog
      open={open}
      PaperProps={{ elevation: 1 }}
      TransitionComponent={Transition}
      onClose={closeHandler}
    >
      <DialogTitle>{t_i18n('Important notice: your action is required!')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ marginBottom: 3, whiteSpace: 'break-spaces' }}>
          {t_i18n(
            '',
            {
              id: `alert_${alert.type}`,
              values: {
                link_blogpost: <a href={'https://blog.filigran.io/'}>{t_i18n('this blogpost')}</a>,
                link_slack: <a href={'https://filigran-community.slack.com'}>{t_i18n('our Slack channel')}</a>,
              },
            },
          )}
        </DialogContentText>
        { usersExcerpt.length > 0 && (
          <DialogContentText>
            <Box component="span">{t_i18n('The following user(s) require your attention:')}</Box>
            {usersExcerpt.map((user, index) => (
              <Fragment key={`${user.id}-${index}`}>
                <Link
                  to={`/dashboard/settings/accesses/users/${user.id}`}
                  onClick={closeHandler}
                >
                  {user.name}
                </Link>
                {index !== usersExcerpt.length - 1 && <span>,&nbsp;</span>}
              </Fragment>
            ))}
            { restCount > 0 && (
            <Box component="span" sx={{ marginLeft: 0.5 }}>
              { t_i18n('', { id: 'and ... more', values: { count: restCount } }) }
            </Box>
            )}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={goToSettingsHandler} color={'secondary'} >
          {t_i18n('Open Settings')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlatformCriticalAlertBanner;
