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
                var generateQRCodeBase64 = (url) => {
                    var promise = new Promise(function (resolve, reject) {
                        var qrcode = new QRCode(document.createElement('div'), {
                            text: url,
                            width: 128,
                            height: 128,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                        qrcode._oDrawing._elImage.onload = ev => { 
                            resolve(ev.target.src);
                        }
                    });
                    return promise;
                }
                var showQRCode = async (url) => {
                    var base64 = await generateQRCodeBase64(url);
                    return await this.showPopup('DeceiptPopup', {
                        title: "Deceipt QR",
                        body: `<img src="${base64}">`,
                    });
                }
                var htmlToImg = (receipt) => {
                    var self = this;
                    $('.pos-receipt-print').html(receipt);
                    var promise = new Promise(function (resolve, reject) {
                        var receipt = $('.pos-receipt-print>.pos-receipt');
                        html2canvas(receipt[0], {
                            onparsed: function(queue) {
                                queue.stack.ctx.height = Math.ceil(receipt.outerHeight() + receipt.offset().top);
                                queue.stack.ctx.width = Math.ceil(receipt.outerWidth() + receipt.offset().left);
                            },
                            onrendered: function (canvas) {
                                $('.pos-receipt-print').empty();
                                resolve(canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64,',''));
                            },
                            letterRendering: self.env.pos.htmlToImgLetterRendering(),
                        })
                    });
                    return promise;
                }

                // if Deceipt QR code was generated, re-use
                if (this.currentOrder._deceiptGenerated) {
                    console.log("No need to generate qr code");
                    var qrCode = this.currentOrder._deceiptURL;
                    await showQRCode(qrCode);
                } else {
                    console.log("generate qr code");

                    // Generate receipt image and upload
                    // var receipt = this.orderReceipt.el.outerHTML;
                    // var image = await htmlToImg(receipt);
                    // var content = $.ajax({
                    //     url: 'https://google.com',
                    //     method: 'GET',
                    //     timeout: 1000,
                    // });
        
                    
                    // upload successfully
                    var deceiptURL = "https://google.com";
                    this.currentOrder._deceiptGenerated = true;
                    this.currentOrder._deceiptURL = deceiptURL;
                    
                    await showQRCode(deceiptURL);
                }
            } catch (e) {
                await this.showPopup('ErrorPopup', {
                    title: "Error when generating Deceipt QR code",
                    body: e,
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
