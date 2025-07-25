import "#components/ak-page-header";

import { Table } from "#elements/table/Table";

import { msg } from "@lit/localize";
import { CSSResult, html, nothing, TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

import PFContent from "@patternfly/patternfly/components/Content/content.css";
import PFPage from "@patternfly/patternfly/components/Page/page.css";
import PFSidebar from "@patternfly/patternfly/components/Sidebar/sidebar.css";

export abstract class TablePage<T> extends Table<T> {
    abstract pageTitle(): string;
    abstract pageDescription(): string | undefined;
    abstract pageIcon(): string;

    static styles: CSSResult[] = [...super.styles, PFPage, PFContent, PFSidebar];

    renderSidebarBefore(): TemplateResult {
        return html``;
    }

    renderSidebarAfter(): TemplateResult {
        return html``;
    }

    // Optionally render section above the table
    renderSectionBefore(): TemplateResult {
        return html``;
    }

    // Optionally render section below the table
    renderSectionAfter(): TemplateResult {
        return html``;
    }

    renderEmpty(inner?: TemplateResult): TemplateResult {
        return super.renderEmpty(html`
            ${inner
                ? inner
                : html`<ak-empty-state icon=${this.pageIcon()}
                      ><span>${msg("No objects found.")}</span>
                      <div slot="body">
                          ${this.searchEnabled() ? this.renderEmptyClearSearch() : nothing}
                      </div>
                      <div slot="primary">${this.renderObjectCreate()}</div>
                  </ak-empty-state>`}
        `);
    }

    renderEmptyClearSearch(): TemplateResult {
        if (this.search === "") {
            return html``;
        }
        return html`<button
            @click=${() => {
                this.search = "";
                this.requestUpdate();
                this.fetch();
                this.page = 1;
            }}
            class="pf-c-button pf-m-link"
        >
            ${msg("Clear search")}
        </button>`;
    }

    render(): TemplateResult {
        return html`<ak-page-header
                icon=${this.pageIcon()}
                header=${this.pageTitle()}
                description=${ifDefined(this.pageDescription())}
            >
            </ak-page-header>
            ${this.renderSectionBefore()}
            <section class="pf-c-page__main-section pf-m-no-padding-mobile">
                <div class="pf-c-sidebar pf-m-gutter">
                    <div class="pf-c-sidebar__main">
                        ${this.renderSidebarBefore()}
                        <div class="pf-c-sidebar__content">
                            <div class="pf-c-card">${this.renderTable()}</div>
                        </div>
                        ${this.renderSidebarAfter()}
                    </div>
                </div>
            </section>
            ${this.renderSectionAfter()}`;
    }
}
