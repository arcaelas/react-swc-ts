import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { createTheme, type LinkProps } from '@mui/material';

import { ThemeOptions } from '@mui/material/styles';
export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#5c3bfe',
      light: '#7558fd',
      dark: '#411bf9',
      contrastText: '#f4f4f4',
    },
    background: {
      default: '#f4f4f4',
      paper: '#f1f1f1',
    },
    text: {
      primary: '#5f6368',
      secondary: '#5f6368',
      disabled: 'rgba(148,154,160,0.4)',
    },
  },
};


const LinkBehavior = React.forwardRef(({ href, ...props }: any, ref) => 
  <RouterLink ref={ref} to={href} {...props} />
);
export default createTheme({
  ...themeOptions,
  components: {
    MuiLink: {
      defaultProps: {
        component: LinkBehavior,
      } as LinkProps,
    },
    MuiButtonBase: {
      defaultProps: {
        LinkComponent: LinkBehavior,
      },
    },
  },
});
