import type Phaser from 'phaser';
import { COLORS, dp, FONT_FAMILY } from '../config/display';

export function textStyle(sizeDp: number, color: string = COLORS.text, bold = true): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${Math.round(dp(sizeDp))}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color,
    align: 'center',
  };
}
