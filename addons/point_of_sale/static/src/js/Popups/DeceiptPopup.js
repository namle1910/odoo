odoo.define('point_of_sale.DeceiptPopup', function(require) {
    'use strict';

    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const { _lt } = require('@web/core/l10n/translation');

    // formerly DeceiptPopupWidget
    class DeceiptPopup extends AbstractAwaitablePopup {}
    DeceiptPopup.template = 'DeceiptPopup';
    DeceiptPopup.defaultProps = {
        confirmText: _lt('Ok'),
        cancelText: _lt('Cancel'),
        title: _lt('Confirm ?'),
        body: '',
    };

    Registries.Component.add(DeceiptPopup);

    return DeceiptPopup;
});
