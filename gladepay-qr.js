(function () {
  'use strict';

  window.renderGladePayQr = function renderGladePayQr(imageElement, imageSource, pixCode) {
    if (!imageElement) return false;

    if (imageSource) {
      imageElement.src = imageSource;
      imageElement.style.display = '';
      return true;
    }

    if (!pixCode || typeof window.QRCode !== 'function') {
      imageElement.removeAttribute('src');
      imageElement.style.display = 'none';
      return false;
    }

    try {
      const container = document.createElement('div');
      new window.QRCode(container, {
        text: pixCode,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });

      const canvas = container.querySelector('canvas');
      const generatedImage = container.querySelector('img');
      const generatedSource = canvas
        ? canvas.toDataURL('image/png')
        : generatedImage && generatedImage.src;

      if (!generatedSource) throw new Error('Imagem do QR Code não foi gerada.');

      imageElement.src = generatedSource;
      imageElement.style.display = '';
      return true;
    } catch (error) {
      console.error('Falha ao gerar QR Code localmente:', error);
      imageElement.removeAttribute('src');
      imageElement.style.display = 'none';
      return false;
    }
  };
})();
