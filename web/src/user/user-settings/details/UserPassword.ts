import { AndNext } from "#common/api/config";
import { globalAK } from "#common/global";

import { AKElement } from "#elements/Base";

import { msg } from "@lit/localize";
import { CSSResult, html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFCard from "@patternfly/patternfly/components/Card/card.css";
import PFForm from "@patternfly/patternfly/components/Form/form.css";
import PFFormControl from "@patternfly/patternfly/components/FormControl/form-control.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";

@customElement("ak-user-settings-password")
export class UserSettingsPassword extends AKElement {
    @property()
    configureUrl?: string;

    static styles: CSSResult[] = [PFBase, PFCard, PFButton, PFForm, PFFormControl];

    render(): TemplateResult {
        // For this stage we don't need to check for a configureFlow,
        // as the stage won't return any UI Elements if no configureFlow is set.
        return html`<div class="pf-c-card">
            <div class="pf-c-card__title">${msg("Change your password")}</div>
            <div class="pf-c-card__body">
                <a
                    href="${ifDefined(this.configureUrl)}${AndNext(
                        `${globalAK().api.relBase}if/user/#/settings;${JSON.stringify({ page: "page-details" })}`,
                    )}"
                    class="pf-c-button pf-m-primary"
                >
                    ${msg("Change password")}
                </a>
            </div>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-user-settings-password": UserSettingsPassword;
    }
}
