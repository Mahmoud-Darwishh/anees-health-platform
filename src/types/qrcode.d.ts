declare module 'qrcode' {
  interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8';
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  const QRCode: {
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}