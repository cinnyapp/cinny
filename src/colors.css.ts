import { createTheme } from '@vanilla-extract/css';
import { color } from 'folds';

export const silverTheme = createTheme(color, {
  Background: {
    Container: '#E6E6E6',
    ContainerHover: '#DADADA',
    ContainerActive: '#CECECE',
    ContainerLine: '#C2C2C2',
    OnContainer: '#000000',
  },

  Surface: {
    Container: '#F2F2F2',
    ContainerHover: '#E6E6E6',
    ContainerActive: '#DADADA',
    ContainerLine: '#CECECE',
    OnContainer: '#000000',
  },

  SurfaceVariant: {
    Container: '#E6E6E6',
    ContainerHover: '#DADADA',
    ContainerActive: '#CECECE',
    ContainerLine: '#C2C2C2',
    OnContainer: '#000000',
  },

  Primary: {
    Main: '#1858D5',
    MainHover: '#164FC0',
    MainActive: '#144BB5',
    MainLine: '#1346AA',
    OnMain: '#FFFFFF',
    Container: '#E8EEFB',
    ContainerHover: '#DCE6F9',
    ContainerActive: '#D1DEF7',
    ContainerLine: '#C5D5F5',
    OnContainer: '#113E95',
  },

  Secondary: {
    Main: '#000000',
    MainHover: '#0C0C0C',
    MainActive: '#181818',
    MainLine: '#303030',
    OnMain: '#F2F2F2',
    Container: '#CECECE',
    ContainerHover: '#C2C2C2',
    ContainerActive: '#B5B5B5',
    ContainerLine: '#A9A9A9',
    OnContainer: '#0C0C0C',
  },

  Success: {
    Main: '#00844C',
    MainHover: '#007744',
    MainActive: '#007041',
    MainLine: '#006A3D',
    OnMain: '#FFFFFF',
    Container: '#E5F3ED',
    ContainerHover: '#D9EDE4',
    ContainerActive: '#CCE6DB',
    ContainerLine: '#BFE0D2',
    OnContainer: '#005C35',
  },

  Warning: {
    Main: '#A85400',
    MainHover: '#974C00',
    MainActive: '#8F4700',
    MainLine: '#864300',
    OnMain: '#FFFFFF',
    Container: '#F6EEE5',
    ContainerHover: '#F2E5D9',
    ContainerActive: '#EEDDCC',
    ContainerLine: '#E9D4BF',
    OnContainer: '#763B00',
  },

  Critical: {
    Main: '#C40E0E',
    MainHover: '#AC0909',
    MainActive: '#A60C0C',
    MainLine: '#9C0B0B',
    OnMain: '#FFFFFF',
    Container: '#F9E7E7',
    ContainerHover: '#F6DBDB',
    ContainerActive: '#F3CFCF',
    ContainerLine: '#F0C3C3',
    OnContainer: '#890A0A',
  },

  Other: {
    FocusRing: 'rgba(0 0 0 / 50%)',
    Shadow: 'rgba(0 0 0 / 20%)',
    Overlay: 'rgba(0 0 0 / 50%)',
  },
});

const darkThemeData = {
  Background: {
    Container: '#15171A',
    ContainerHover: '#1F2326',
    ContainerActive: '#2A2E33',
    ContainerLine: '#343A40',
    OnContainer: '#ffffff',
  },

  Surface: {
    Container: '#1F2326',
    ContainerHover: '#2A2E33',
    ContainerActive: '#343A40',
    ContainerLine: '#3F464D',
    OnContainer: '#ffffff',
  },

  SurfaceVariant: {
    Container: '#2A2E33',
    ContainerHover: '#343A40',
    ContainerActive: '#3F464D',
    ContainerLine: '#495159',
    OnContainer: '#ffffff',
  },

  Primary: {
    Main: '#BDB6EC',
    MainHover: '#B2AAE9',
    MainActive: '#ADA3E8',
    MainLine: '#A79DE6',
    OnMain: '#2C2843',
    Container: '#413C65',
    ContainerHover: '#494370',
    ContainerActive: '#50497B',
    ContainerLine: '#575086',
    OnContainer: '#E3E1F7',
  },

  Secondary: {
    Main: '#D1E8FF',
    MainHover: '#BCD1E5',
    MainActive: '#B2C5D9',
    MainLine: '#A7BACC',
    OnMain: '#15171A',
    Container: '#343A40',
    ContainerHover: '#3F464D',
    ContainerActive: '#495159',
    ContainerLine: '#545D66',
    OnContainer: '#C7DCF2',
  },

  Success: {
    Main: '#85E0BA',
    MainHover: '#70DBAF',
    MainActive: '#66D9A9',
    MainLine: '#5CD6A3',
    OnMain: '#0F3D2A',
    Container: '#175C3F',
    ContainerHover: '#1A6646',
    ContainerActive: '#1C704D',
    ContainerLine: '#1F7A54',
    OnContainer: '#CCF2E2',
  },

  Warning: {
    Main: '#E3BA91',
    MainHover: '#DFAF7E',
    MainActive: '#DDA975',
    MainLine: '#DAA36C',
    OnMain: '#3F2A15',
    Container: '#5E3F20',
    ContainerHover: '#694624',
    ContainerActive: '#734D27',
    ContainerLine: '#7D542B',
    OnContainer: '#F3E2D1',
  },

  Critical: {
    Main: '#E69D9D',
    MainHover: '#E28D8D',
    MainActive: '#E08585',
    MainLine: '#DE7D7D',
    OnMain: '#401C1C',
    Container: '#602929',
    ContainerHover: '#6B2E2E',
    ContainerActive: '#763333',
    ContainerLine: '#803737',
    OnContainer: '#F5D6D6',
  },

  Other: {
    FocusRing: 'rgba(255, 255, 255, 0.5)',
    Shadow: 'rgba(0, 0, 0, 1)',
    Overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export const darkTheme = createTheme(color, darkThemeData);

export const butterTheme = createTheme(color, {
  ...darkThemeData,
  Background: {
    Container: '#1A1916',
    ContainerHover: '#262621',
    ContainerActive: '#33322C',
    ContainerLine: '#403F38',
    OnContainer: '#FFFBDE',
  },

  Surface: {
    Container: '#262621',
    ContainerHover: '#33322C',
    ContainerActive: '#403F38',
    ContainerLine: '#4D4B43',
    OnContainer: '#FFFBDE',
  },

  SurfaceVariant: {
    Container: '#33322C',
    ContainerHover: '#403F38',
    ContainerActive: '#4D4B43',
    ContainerLine: '#59584E',
    OnContainer: '#FFFBDE',
  },

  Secondary: {
    Main: '#FFFBDE',
    MainHover: '#E5E2C8',
    MainActive: '#D9D5BD',
    MainLine: '#CCC9B2',
    OnMain: '#1A1916',
    Container: '#403F38',
    ContainerHover: '#4D4B43',
    ContainerActive: '#59584E',
    ContainerLine: '#666459',
    OnContainer: '#F2EED3',
  },
});
