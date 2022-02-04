odoo.define('point_of_sale.AbstractReceiptScreen', function (require) {
    'use strict';

    const { nextFrame } = require('point_of_sale.utils');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    const { useRef } = owl;

    /**
     * This relies on the assumption that there is a reference to
     * `order-receipt` so it is important to declare a `t-ref` to
     * `order-receipt` in the template of the Component that extends
     * this abstract component.
     */
    class AbstractReceiptScreen extends PosComponent {
        setup() {
            super.setup();
            this.orderReceipt = useRef('order-receipt');
        }
        async _printReceipt() {
            if (this.env.proxy.printer) {
                const printResult = await this.env.proxy.printer.print_receipt(this.orderReceipt.el.innerHTML);
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
        async _getDeceiptUploadURL(hostID, orderUID) {
            var API_BASE_URL = this.env.pos.config.deceipt_api_base_url;
            return await $.ajax({
                type: "POST",
                url: `${API_BASE_URL}/receipt/upload-url`,
                data: JSON.stringify({
                    HostID: hostID,
                    ReferenceID: orderUID,
                })
            });
        }
        async _uploadDeceipt(uploadURL, receiptID, receiptHTML) {
            var htmlToBase64 = (receipt) => {
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
                            resolve(canvas.toDataURL('image/jpeg').split(",")[1]);
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
            return await $.ajax({
                type: "PUT",
                url: uploadURL,
                headers: {
                    "x-amz-meta-id": receiptID
                },
                data: base64toBlob(await htmlToBase64(receiptHTML)),
                processData: false,
                contentType: false
            })
        }
        async _reissueDeceipt(hostID, orderUID) {
            var API_BASE_URL = this.env.pos.config.deceipt_api_base_url;
            return await $.ajax({
                type: "POST",
                url: `${API_BASE_URL}/receipt/reissue`,
                data: JSON.stringify({
                    HostID: hostID,
                    ReferenceID: orderUID,
                })
            });
        }
        async _printDeceipt(orderUID) {
            try {
                var hostID = 1;
                var PORTAL_BASE_URL = this.env.pos.config.deceipt_portal_base_url;
                var API_BASE_URL = this.env.pos.config.deceipt_api_base_url;
                var receiptHTML = this.orderReceipt.el.innerHTML;

                // Validate Deceipt Config
                if (!(PORTAL_BASE_URL && API_BASE_URL)) {
                    throw new Error("Please config Deceipt base URL in POS config first!");
                }

                try {
                    // create receipt upload url
                    var getUploadURLResp = await this._getDeceiptUploadURL(hostID, orderUID)
                    var uploadURL = getUploadURLResp.UploadURL;
                    var receiptID = getUploadURLResp.ID;
                    
                    // upload receipt
                    // let this function run in the background so the UX will be less delay
                    await this._uploadDeceipt(uploadURL, receiptID, receiptHTML);
                } catch (e) {
		            // TODO: Hard code for now. Need to update when doing custom error task
                    if (
                        e.responseJSON 
                        && e.responseJSON.Message 
                        && e.responseJSON.Message == "receipt existed"
                    ) {
                        var reissueResp = await this._reissueDeceipt(hostID, orderUID);
                        var receiptID = reissueResp.ID;
                    } else {
                        throw e;
                    }
                }

                var deceiptURL = `${PORTAL_BASE_URL}/receipt?id=${receiptID}`;
                await this.showPopup('DeceiptPopup', { deceiptURL });
            } catch (e) {
                var message = e;
                if (e.responseXML && $(e.responseXML).find("Message")[0]) {
                    message = $(e.responseXML).find("Message")[0].innerHTML;
                }
                if (e.responseJSON) {
                    message = e.responseJSON.message || e.responseJSON.Message;
                }
                await this.showPopup('ErrorPopup', {
                    title: "Error when generating Deceipt QR code",
                    body: message
                });
            }
        }
        async _printWeb() {
            try {
                window.print();
                return true;
            } catch (_err) {
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
