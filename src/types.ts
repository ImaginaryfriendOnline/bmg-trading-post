export type TradeAction = 'Trade' | 'Buy' | 'Scribe' | 'None';

export interface TradeRow {
  action: TradeAction;
  itemGold: string;
  newItemSpell: string;
}

export interface CertificateFields {
  convention: string;
  player: string;
  character: string;
  trades: [TradeRow, TradeRow, TradeRow];
  notes: string;
  signoff: string;
}

export interface DeathInsuranceFields {
  player: string;
  characterAndLevel: string;
  signature: string;
}

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type LogoChoice = 'none' | 'bmg' | 'iuzual';

export type CertId = 'trade' | 'death-insurance';

export interface PlayerRequestFields {
  player: string;
  character: string;
  trades: [TradeRow, TradeRow, TradeRow];
  notes: string;
}

export interface PlayerRequestDoc extends PlayerRequestFields {
  createdAt: number;
  status: 'pending' | 'claimed';
  convention?: string;
}

export type PasswordSlot = 'cert-gen' | 'admin';

export interface PasswordConfigDoc {
  certGenHash?: string;
  adminHash?: string;
}

export interface AppSettingsDoc {
  defaultConvention?: string;
}
