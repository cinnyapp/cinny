import { createTheme } from '@vanilla-extract/css';
import { color } from 'folds';

export const silverTheme = createTheme(color, {
  Background: {
    Container: '#DEDEDE',
    ContainerHover: '#D3D3D3',
    ContainerActive: '#C7C7C7',
    ContainerLine: '#BBBBBB',
    OnContainer: '#000000',
  },

  Surface: {
    Container: '#EAEAEA',
    ContainerHover: '#DEDEDE',
    ContainerActive: '#D3D3D3',
    ContainerLine: '#C7C7C7',
    OnContainer: '#000000',
  },

  SurfaceVariant: {
    Container: '#DEDEDE',
    ContainerHover: '#D3D3D3',
    ContainerActive: '#C7C7C7',
    ContainerLine: '#BBBBBB',
    OnContainer: '#000000',
  },

  Primary: {
    Main: '#1245A8',
    MainHover: '#103E97',
    MainActive: '#0F3B8F',
    MainLine: '#0E3786',
    OnMain: '#FFFFFF',
    Container: '#C4D0E9',
    ContainerHover: '#B8C7E5',
    ContainerActive: '#ACBEE1',
    ContainerLine: '#A0B5DC',
    OnContainer: '#0D3076',
  },

  Secondary: {
    Main: '#000000',
    MainHover: '#171717',
    MainActive: '#232323',
    MainLine: '#2F2F2F',
    OnMain: '#EAEAEA',
    Container: '#C7C7C7',
    ContainerHover: '#BBBBBB',
    ContainerActive: '#AFAFAF',
    ContainerLine: '#A4A4A4',
    OnContainer: '#0C0C0C',
  },

  Success: {
    Main: '#017343',
    MainHover: '#01683C',
    MainActive: '#016239',
    MainLine: '#015C36',
    OnMain: '#FFFFFF',
    Container: '#BFDCD0',
    ContainerHover: '#B3D5C7',
    ContainerActive: '#A6CEBD',
    ContainerLine: '#99C7B4',
    OnContainer: '#01512F',
  },

  Warning: {
    Main: '#864300',
    MainHover: '#793C00',
    MainActive: '#723900',
    MainLine: '#6B3600',
    OnMain: '#FFFFFF',
    Container: '#E1D0BF',
    ContainerHover: '#DBC7B2',
    ContainerActive: '#D5BDA6',
    ContainerLine: '#CFB499',
    OnContainer: '#5E2F00',
  },

  Critical: {
    Main: '#9D0F0F',
    MainHover: '#8D0E0E',
    MainActive: '#850D0D',
    MainLine: '#7E0C0C',
    OnMain: '#FFFFFF',
    Container: '#E7C3C3',
    ContainerHover: '#E2B7B7',
    ContainerActive: '#DDABAB',
    ContainerLine: '#D89F9F',
    OnContainer: '#6E0B0B',
  },

  Other: {
    FocusRing: 'rgba(0 0 0 / 50%)',
    Shadow: 'rgba(0 0 0 / 20%)',
    Overlay: 'rgba(0 0 0 / 50%)',
  },
});

const darkThemeData = {
  Background: {
    Container: '#2A2E33',
    ContainerHover: '#32373D',
    ContainerActive: '#3B4047',
    ContainerLine: '#3B4047',
    OnContainer: '#ffffff',
  },

  Surface: {
    Container: '#3B4047',
    ContainerHover: '#434952',
    ContainerActive: '#4C525C',
    ContainerLine: '#4C525C',
    OnContainer: '#ffffff',
  },

  SurfaceVariant: {
    Container: '#4C525C',
    ContainerHover: '#545B66',
    ContainerActive: '#5C6470',
    ContainerLine: '#5C6470',
    OnContainer: '#ffffff',
  },

  Primary: {
    Main: '#9C8CFF',
    MainHover: '#9485F2',
    MainActive: '#8C7EE5',
    MainLine: '#8577D9',
    OnMain: '#171526',
    Container: '#463F73',
    ContainerHover: '#4E4680',
    ContainerActive: '#564D8C',
    ContainerLine: '#5E5499',
    OnContainer: '#D7D1FF',
  },

  Secondary: {
    Main: '#D2E3FF',
    MainHover: '#C7D8F2',
    MainActive: '#BDCCE5',
    MainLine: '#B3C1D9',
    OnMain: '#1F2226',
    Container: '#5F6673',
    ContainerHover: '#697280',
    ContainerActive: '#747D8C',
    ContainerLine: '#7E8899',
    OnContainer: '#EDF4FF',
  },

  Success: {
    Main: '#5CFFBA',
    MainHover: '#57F2B1',
    MainActive: '#53E5A7',
    MainLine: '#4ED99E',
    OnMain: '#0E261C',
    Container: '#297354',
    ContainerHover: '#2E805D',
    ContainerActive: '#338C66',
    ContainerLine: '#379970',
    OnContainer: '#BEFFE3',
  },

  Warning: {
    Main: '#FFB266',
    MainHover: '#F2A961',
    MainActive: '#E5A05C',
    MainLine: '#D99757',
    OnMain: '#261B0F',
    Container: '#73502E',
    ContainerHover: '#805933',
    ContainerActive: '#8C6238',
    ContainerLine: '#996B3D',
    OnContainer: '#FFE0C2',
  },

  Critical: {
    Main: '#FF8080',
    MainHover: '#F27A7A',
    MainActive: '#E57373',
    MainLine: '#D96D6D',
    OnMain: '#261313',
    Container: '#733A3A',
    ContainerHover: '#804040',
    ContainerActive: '#8C4646',
    ContainerLine: '#994D4D',
    OnContainer: '#FFCCCC',
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
