import "#elements/forms/FormGroup";
import "#elements/forms/HorizontalFormElement";
import "#elements/forms/Radio";
import "#elements/forms/SearchSelect/index";

import { DEFAULT_CONFIG } from "#common/api/config";

import { RenderFlowOption } from "#admin/flows/utils";
import { BaseStageForm } from "#admin/stages/BaseStageForm";

import {
    AuthenticatorSMSStage,
    AuthTypeEnum,
    Flow,
    FlowsApi,
    FlowsInstancesListDesignationEnum,
    FlowsInstancesListRequest,
    NotificationWebhookMapping,
    PropertymappingsApi,
    PropertymappingsNotificationListRequest,
    ProviderEnum,
    StagesApi,
} from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ak-stage-authenticator-sms-form")
export class AuthenticatorSMSStageForm extends BaseStageForm<AuthenticatorSMSStage> {
    loadInstance(pk: string): Promise<AuthenticatorSMSStage> {
        return new StagesApi(DEFAULT_CONFIG)
            .stagesAuthenticatorSmsRetrieve({
                stageUuid: pk,
            })
            .then((stage) => {
                this.provider = stage.provider;
                this.authType = stage.authType;
                return stage;
            });
    }

    @property({ attribute: false })
    provider: ProviderEnum = ProviderEnum.Twilio;

    @property({ attribute: false })
    authType?: AuthTypeEnum;

    async send(data: AuthenticatorSMSStage): Promise<AuthenticatorSMSStage> {
        if (this.instance) {
            return new StagesApi(DEFAULT_CONFIG).stagesAuthenticatorSmsUpdate({
                stageUuid: this.instance.pk || "",
                authenticatorSMSStageRequest: data,
            });
        }
        return new StagesApi(DEFAULT_CONFIG).stagesAuthenticatorSmsCreate({
            authenticatorSMSStageRequest: data,
        });
    }

    renderProviderTwillio(): TemplateResult {
        return html` <ak-form-element-horizontal
                label=${msg("Twilio Account SID")}
                required
                name="accountSid"
            >
                <input
                    type="text"
                    value="${this.instance?.accountSid ?? ""}"
                    class="pf-c-form-control pf-m-monospace"
                    autocomplete="off"
                    spellcheck="false"
                    required
                />
                <p class="pf-c-form__helper-text">
                    ${msg("Get this value from https://console.twilio.com")}
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${msg("Twilio Auth Token")} required name="auth">
                <input
                    type="text"
                    value="${this.instance?.auth ?? ""}"
                    class="pf-c-form-control pf-m-monospace"
                    autocomplete="off"
                    spellcheck="false"
                    required
                />
                <p class="pf-c-form__helper-text">
                    ${msg("Get this value from https://console.twilio.com")}
                </p>
            </ak-form-element-horizontal>`;
    }

    renderProviderGeneric(): TemplateResult {
        return html`
            <ak-form-element-horizontal
                label=${msg("Authentication Type")}
                @change=${(ev: Event) => {
                    const current = (ev.target as HTMLInputElement).value;
                    this.authType = current as AuthTypeEnum;
                }}
                required
                name="authType"
            >
                <ak-radio
                    .options=${[
                        {
                            label: msg("Basic Auth"),
                            value: AuthTypeEnum.Basic,
                            default: true,
                        },
                        {
                            label: msg("Bearer Token"),
                            value: AuthTypeEnum.Bearer,
                        },
                    ]}
                    .value=${this.instance?.authType}
                >
                </ak-radio>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${msg("External API URL")} required name="accountSid">
                <input
                    type="text"
                    value="${this.instance?.accountSid ?? ""}"
                    class="pf-c-form-control pf-m-monospace"
                    autocomplete="off"
                    spellcheck="false"
                    required
                />
                <p class="pf-c-form__helper-text">
                    ${msg("This is the full endpoint to send POST requests to.")}
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${msg("API Auth Username")} required name="auth">
                <input
                    type="text"
                    value="${this.instance?.auth ?? ""}"
                    class="pf-c-form-control pf-m-monospace"
                    autocomplete="off"
                    spellcheck="false"
                />
                <p class="pf-c-form__helper-text">
                    ${msg(
                        "This is the username to be used with basic auth or the token when used with bearer token",
                    )}
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal
                label=${msg("API Auth password")}
                ?required=${false}
                name="authPassword"
            >
                <input
                    type="text"
                    value="${this.instance?.authPassword ?? ""}"
                    class="pf-c-form-control pf-m-monospace"
                    autocomplete="off"
                    spellcheck="false"
                />
                <p class="pf-c-form__helper-text">
                    ${msg("This is the password to be used with basic auth")}
                </p>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label=${msg("Mapping")} name="mapping">
                <ak-search-select
                    .fetchObjects=${async (
                        query?: string,
                    ): Promise<NotificationWebhookMapping[]> => {
                        const args: PropertymappingsNotificationListRequest = {
                            ordering: "saml_name",
                        };
                        if (query !== undefined) {
                            args.search = query;
                        }
                        const items = await new PropertymappingsApi(
                            DEFAULT_CONFIG,
                        ).propertymappingsNotificationList(args);
                        return items.results;
                    }}
                    .renderElement=${(item: NotificationWebhookMapping): string => {
                        return item.name;
                    }}
                    .value=${(item: NotificationWebhookMapping | undefined): string | undefined => {
                        return item?.pk;
                    }}
                    .selected=${(item: NotificationWebhookMapping): boolean => {
                        return this.instance?.mapping === item.pk;
                    }}
                    blankable
                >
                </ak-search-select>
                <p class="pf-c-form__helper-text">
                    ${msg("Modify the payload sent to the custom provider.")}
                </p>
            </ak-form-element-horizontal>
        `;
    }

    renderForm(): TemplateResult {
        return html` <span>
                ${msg("Stage used to configure an SMS-based TOTP authenticator.")}
            </span>
            <ak-form-element-horizontal label=${msg("Name")} required name="name">
                <input
                    type="text"
                    value="${this.instance?.name ?? ""}"
                    class="pf-c-form-control"
                    required
                />
            </ak-form-element-horizontal>
            <ak-form-element-horizontal
                label=${msg("Authenticator type name")}
                ?required=${false}
                name="friendlyName"
            >
                <input
                    type="text"
                    value="${this.instance?.friendlyName ?? ""}"
                    class="pf-c-form-control"
                />
                <p class="pf-c-form__helper-text">
                    ${msg(
                        "Display name of this authenticator, used by users when they enroll an authenticator.",
                    )}
                </p>
            </ak-form-element-horizontal>
            <ak-form-group expanded>
                <span slot="header"> ${msg("Stage-specific settings")} </span>
                <div slot="body" class="pf-c-form">
                    <ak-form-element-horizontal label=${msg("Provider")} required name="provider">
                        <select
                            class="pf-c-form-control"
                            @change=${(ev: Event) => {
                                const current = (ev.target as HTMLInputElement).value;
                                this.provider = current as ProviderEnum;
                            }}
                        >
                            <option
                                value="${ProviderEnum.Twilio}"
                                ?selected=${this.instance?.provider === ProviderEnum.Twilio}
                            >
                                ${msg("Twilio")}
                            </option>
                            <option
                                value="${ProviderEnum.Generic}"
                                ?selected=${this.instance?.provider === ProviderEnum.Generic}
                            >
                                ${msg("Generic")}
                            </option>
                        </select>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("From number")}
                        required
                        name="fromNumber"
                    >
                        <input
                            type="text"
                            value="${this.instance?.fromNumber ?? ""}"
                            class="pf-c-form-control pf-m-monospace"
                            autocomplete="off"
                            spellcheck="false"
                            required
                        />
                        <p class="pf-c-form__helper-text">
                            ${msg("Number the SMS will be sent from.")}
                        </p>
                    </ak-form-element-horizontal>
                    ${this.provider === ProviderEnum.Generic
                        ? this.renderProviderGeneric()
                        : this.renderProviderTwillio()}
                    <ak-form-element-horizontal name="verifyOnly">
                        <label class="pf-c-switch">
                            <input
                                class="pf-c-switch__input"
                                type="checkbox"
                                ?checked=${this.instance?.verifyOnly ?? false}
                            />
                            <span class="pf-c-switch__toggle">
                                <span class="pf-c-switch__toggle-icon">
                                    <i class="fas fa-check" aria-hidden="true"></i>
                                </span>
                            </span>
                            <span class="pf-c-switch__label">${msg("Hash phone number")}</span>
                        </label>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "If enabled, only a hash of the phone number will be saved. This can be done for data-protection reasons. Devices created from a stage with this enabled cannot be used with the authenticator validation stage.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                    <ak-form-element-horizontal
                        label=${msg("Configuration flow")}
                        name="configureFlow"
                    >
                        <ak-search-select
                            .fetchObjects=${async (query?: string): Promise<Flow[]> => {
                                const args: FlowsInstancesListRequest = {
                                    ordering: "slug",
                                    designation:
                                        FlowsInstancesListDesignationEnum.StageConfiguration,
                                };
                                if (query !== undefined) {
                                    args.search = query;
                                }
                                const flows = await new FlowsApi(DEFAULT_CONFIG).flowsInstancesList(
                                    args,
                                );
                                return flows.results;
                            }}
                            .renderElement=${(flow: Flow): string => {
                                return RenderFlowOption(flow);
                            }}
                            .renderDescription=${(flow: Flow): TemplateResult => {
                                return html`${flow.name}`;
                            }}
                            .value=${(flow: Flow | undefined): string | undefined => {
                                return flow?.pk;
                            }}
                            .selected=${(flow: Flow): boolean => {
                                return this.instance?.configureFlow === flow.pk;
                            }}
                            blankable
                        >
                        </ak-search-select>
                        <p class="pf-c-form__helper-text">
                            ${msg(
                                "Flow used by an authenticated user to configure this Stage. If empty, user will not be able to configure this stage.",
                            )}
                        </p>
                    </ak-form-element-horizontal>
                </div>
            </ak-form-group>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-stage-authenticator-sms-form": AuthenticatorSMSStageForm;
    }
}
