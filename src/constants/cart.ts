/** Cart workflow status. */
export enum CartStatus {
    GENERATE = 'generate',
    SEND = 'send',
    APPROVED = 'approved',
}

export const CART_STATUS_DEFAULT = CartStatus.GENERATE;
