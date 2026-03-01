/** Cart workflow status. */
export enum CartStatus {
    GENERATE = 'generate',
    SEND = 'send',
    UPDATED = 'updated',
    APPROVED = 'approved',
}

export const CART_STATUS_DEFAULT = CartStatus.GENERATE;
