import { createTheme, createThemeContract } from '@vanilla-extract/css';
import { color } from 'folds';

export const extendedColor = createThemeContract({
  background: '',
});

const ThemeContract = {
  ...extendedColor,
  ...color,
};

export const lightTheme = createTheme(ThemeContract, {
  background: '#F2F2F2',
  Background: {
    Container: '#F2F2F2',
    ContainerHover: '#E5E5E5',
    ContainerActive: '#D9D9D9',
    ContainerLine: '#CCCCCC',
    OnContainer: '#000000',
  },

  Surface: {
    Container: '#FFFFFF',
    ContainerHover: '#F2F2F2',
    ContainerActive: '#E5E5E5',
    ContainerLine: '#D9D9D9',
    OnContainer: '#000000',
  },

  SurfaceVariant: {
    Container: '#F2F2F2',
    ContainerHover: '#E5E5E5',
    ContainerActive: '#D9D9D9',
    ContainerLine: '#CCCCCC',
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
    MainHover: '#1A1A1A',
    MainActive: '#262626',
    MainLine: '#333333',
    OnMain: '#FFFFFF',
    Container: '#D9D9D9',
    ContainerHover: '#CCCCCC',
    ContainerActive: '#BFBFBF',
    ContainerLine: '#B2B2B2',
    OnContainer: '#0D0D0D',
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

export const silverTheme = createTheme(ThemeContract, {
  background: '#DEDEDE',
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
  background: color.Background.Container,
  Background: {
    Container: '#1A1A1A',
    ContainerHover: '#262626',
    ContainerActive: '#333333',
    ContainerLine: '#404040',
    OnContainer: '#F2F2F2',
  },

  Surface: {
    Container: '#262626',
    ContainerHover: '#333333',
    ContainerActive: '#404040',
    ContainerLine: '#4D4D4D',
    OnContainer: '#F2F2F2',
  },

  SurfaceVariant: {
    Container: '#333333',
    ContainerHover: '#404040',
    ContainerActive: '#4D4D4D',
    ContainerLine: '#595959',
    OnContainer: '#F2F2F2',
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
    Main: '#FFFFFF',
    MainHover: '#E5E5E5',
    MainActive: '#D9D9D9',
    MainLine: '#CCCCCC',
    OnMain: '#1A1A1A',
    Container: '#404040',
    ContainerHover: '#4D4D4D',
    ContainerActive: '#595959',
    ContainerLine: '#666666',
    OnContainer: '#F2F2F2',
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
    Overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

export const darkTheme = createTheme(ThemeContract, darkThemeData);

export const butterTheme = createTheme(ThemeContract, {
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

export const moonlightTheme = createTheme(ThemeContract, {
  background: 'linear-gradient(to top right, #000546, #000)',

  Background: {
    Container: '#000000',
    ContainerHover: '#01032B',
    ContainerActive: '#020546',
    ContainerLine: '#030977',
    OnContainer: '#EAEBFF',
  },

  Surface: {
    Container: '#01032B',
    ContainerHover: '#020546',
    ContainerActive: '#03075E',
    ContainerLine: '#030977',
    OnContainer: '#EAEBFF',
  },

  SurfaceVariant: {
    Container: '#020546',
    ContainerHover: '#03075E',
    ContainerActive: '#030977',
    ContainerLine: '#030977',
    OnContainer: '#EAEBFF',
  },

  Primary: {
    Main: '#0043FF',
    MainHover: '#1A56FF',
    MainActive: '#3369FF',
    MainLine: '#4D7BFF',
    OnMain: '#FFFFFF',

    Container: '#00144D',
    ContainerHover: '#001B66',
    ContainerActive: '#002180',
    ContainerLine: '#002899',
    OnContainer: '#FFFFFF',
  },

  Secondary: {
    Main: '#E5E7FF',
    MainHover: '#CCCFFF',
    MainActive: '#B2B6FF',
    MainLine: '#999EFF',
    OnMain: '#000000',

    Container: '#030763',
    ContainerHover: '#04097C',
    ContainerActive: '#050B94',
    ContainerLine: '#050CAD',
    OnContainer: '#FFFFFF',
  },

  Success: {
    Main: '#00FF95',
    MainHover: '#00E586',
    MainActive: '#00CC77',
    MainLine: '#4DFFB5',
    OnMain: '#0B2E22',

    Container: '#004D3B',
    ContainerHover: '#00664F',
    ContainerActive: '#008062',
    ContainerLine: '#008062',
    OnContainer: '#CCF2E2',
  },

  Warning: {
    Main: '#FF9933',
    MainHover: '#FFA64D',
    MainActive: '#FFB266',
    MainLine: '#FFBF80',
    OnMain: '#000000',

    Container: '#4D2600',
    ContainerHover: '#663200',
    ContainerActive: '#803F00',
    ContainerLine: '#994C00',
    OnContainer: '#F3E2D1',
  },

  Critical: {
    Main: '#FF0000',
    MainHover: '#E50000',
    MainActive: '#CC0000',
    MainLine: '#FF4D4D',
    OnMain: '#ffffff',

    Container: '#4D0000',
    ContainerHover: '#660000',
    ContainerActive: '#800000',
    ContainerLine: '#990000',
    OnContainer: '#F5D6D6',
  },

  Other: {
    FocusRing: 'hsla(237, 100%, 70%, 0.6)',
    Shadow: 'rgba(0, 0, 0, 0.9)',
    Overlay: 'rgba(0, 0, 0, 0.8)',
  },
});
