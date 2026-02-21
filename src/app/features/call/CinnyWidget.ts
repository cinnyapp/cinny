import { Widget } from 'matrix-widget-api';
import { IApp } from './SmallWidget';

// Wrapper class for the widget definition
export class CinnyWidget extends Widget {
  public constructor(private rawDefinition: IApp) {
    super(rawDefinition);
  }
}
