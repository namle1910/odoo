odoo.define('point_of_sale.DeceiptPopup', function(require) {
    'use strict';

    const { onWillStart, useState } = owl.hooks;
    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const { _lt } = require('@web/core/l10n/translation');

    // formerly DeceiptPopupWidget
    class DeceiptPopup extends AbstractAwaitablePopup {
        static template = 'DeceiptPopup';
        static defaultProps = {
            confirmText: _lt('Ok'),
            cancelText: _lt('Cancel'),
            title: "Deceipt QR",
            deceiptURL: '',
        };

        deceiptPopupState = useState({ loading: false });

        generateQRCodeURI(url) {
            return new Promise((resolve, _) => {
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
        }
        setup() {
            onWillStart(async () => {
                this.props.qrCodeURI = await this.generateQRCodeURI(this.props.deceiptURL);
                this.deceiptPopupState.loading = true;
                setTimeout(() => { this.deceiptPopupState.loading = false; }, 2000);
            });
        }
    }

    Registries.Component.add(DeceiptPopup);

    return DeceiptPopup;
});
