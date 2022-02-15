odoo.define('point_of_sale.AbstractReceiptScreen', function (require) {
    'use strict';

    const { useRef } = owl.hooks;
    const { nextFrame } = require('point_of_sale.utils');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    /**
     * This relies on the assumption that there is a reference to
     * `order-receipt` so it is important to declare a `t-ref` to
     * `order-receipt` in the template of the Component that extends
     * this abstract component.
     */
    class AbstractReceiptScreen extends PosComponent {
        constructor() {
            super(...arguments);
            this.orderReceipt = useRef('order-receipt');
        }
        async _printReceipt() {
            if (this.env.pos.proxy.printer) {
                const printResult = await this.env.pos.proxy.printer.print_receipt(this.orderReceipt.el.outerHTML);
                if (printResult.successful) {
                    return true;
                } else {
                    const { confirmed } = await this.showPopup('ConfirmPopup', {
                        title: printResult.message.title,
                        body: 'Do you want to print using the web printer?',
                    });
                    if (confirmed) {
                        // We want to call the _printWeb when the popup is fully gone
                        // from the screen which happens after the next animation frame.
                        await nextFrame();
                        return await this._printWeb();
                    }
                    return false;
                }
            } else {
                return await this._printWeb();
            }
        }
        async _generateDeceiptQR() {
            try {
                var API_BASE_URL = "xxx";
                var PORTAL_BASE_URL = "xxx";
                var qrCode = this.currentOrder._deceiptURL;
                var isDeceiptGenerated = this.currentOrder._deceiptGenerated
                var receiptHTML = this.orderReceipt.el.outerHTML;
                var qrCodeURI = "";

                // some work around as qrcode lib need specific DOM element to create
                var generateQRCodeURI = (url) => {
                    return new Promise(function (resolve, reject) {
                        if (qrCodeURI != "") resolve(qrCodeURI);
                        var qrcode = new QRCode(document.createElement('div'), {
                            text: url,
                            width: 128,
                            height: 128,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                        qrcode._oDrawing._elImage.onload = ev => { 
                            qrCodeURI = ev.target.src;
                            resolve(ev.target.src);
                        }
                    });
                }
                var showQRCode = async (url) => {
                    return await this.showPopup('DeceiptPopup', {
                        title: "Deceipt QR",
                        body: `<img src="${await generateQRCodeURI(url)}"><div><a href="${url}" target="_blank">link</a></div>`,
                    });
                }
                var htmlToURI = (receipt) => {
                    $('.pos-receipt-print').html(receipt);
                    return new Promise((resolve, reject) => {
                        var receipt = $('.pos-receipt-print>.pos-receipt');
                        html2canvas(receipt[0], {
                            onparsed: function(queue) {
                                queue.stack.ctx.height = Math.ceil(receipt.outerHeight() + receipt.offset().top);
                                queue.stack.ctx.width = Math.ceil(receipt.outerWidth() + receipt.offset().left);
                            },
                            onrendered: function (canvas) {
                                $('.pos-receipt-print').empty();
                                resolve(canvas.toDataURL('image/jpeg'));
                            },
                            letterRendering: this.env.pos.htmlToImgLetterRendering(),
                        })
                    });
                }
                var base64toBlob = (b64Data, contentType='', sliceSize=512) => {
                    const byteCharacters = atob(b64Data);
                    const byteArrays = [];
                    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                      const slice = byteCharacters.slice(offset, offset + sliceSize);
                      const byteNumbers = new Array(slice.length);
                      for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      byteArrays.push(byteArray);
                    }
                    const blob = new Blob(byteArrays, {type: contentType});
                    return blob;
                }

                // if Deceipt QR code was generated, re-use
                if (isDeceiptGenerated) {
                    console.log("No need to generate qr code");
                    await showQRCode(qrCode);
                } else {
                    console.log("generate qr code");

                    // create receipt upload url
                    var { UploadURL, ReceiptID } = await $.ajax({
                        type: "POST",
                        url: `xxx`,
                        data: JSON.stringify({
                            HostID: xxx,
                            LocalFilePath: "xxx"   
                        })
                    });
                    // upload receipt
                    var receiptURI = await htmlToURI(receiptHTML);
                    var receiptBlob = base64toBlob(receiptURI.split(",")[1]);
                    $.ajax({
                        type: "PUT",
                        url: UploadURL,
                        data: receiptBlob,
                        processData: false,
                        contentType: false
                    })
                    
                    // upload successfully
                    var deceiptURL = `xxx`;
                    this.currentOrder._deceiptGenerated = true;
                    this.currentOrder._deceiptURL = deceiptURL;
                    
                    await showQRCode(deceiptURL);
                }
            } catch (e) {
                await this.showPopup('ErrorPopup', {
                    title: "Error when generating Deceipt QR code",
                    body: e.responseJSON ? e.responseJSON.message || e.responseJSON.Message : e,
                });
            }
        }
        async _printWeb() {
            try {
                window.print();
                return true;
            } catch (err) {
                await this.showPopup('ErrorPopup', {
                    title: this.env._t('Printing is not supported on some browsers'),
                    body: this.env._t(
                        'Printing is not supported on some browsers due to no default printing protocol ' +
                            'is available. It is possible to print your tickets by making use of an IoT Box.'
                    ),
                });
                return false;
            }
        }
    }

    Registries.Component.add(AbstractReceiptScreen);

    return AbstractReceiptScreen;
});
