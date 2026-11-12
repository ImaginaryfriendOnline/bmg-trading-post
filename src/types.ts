export type TradeAction = 'Trade' | 'Buy' | 'Scribe';

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
  showLogo: boolean;
}

export interface DeathInsuranceFields {
  player: string;
  characterAndLevel: string;
  signature: string;
}

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type CertId = 'trade' | 'death-insurance';
