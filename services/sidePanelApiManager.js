import { displayStatusMessage } from './statusDisplayManager.js';
import { saveFormDataToStorage, loadFormDataFromStorage, loadThemePreference } from './chromeStorageManager.js';
import { sendMessageToBackgroundScript } from './chromeMessageHandler.js';
import { clearElementContent, populateDatalistWithOptions, createDiscrepancyItemDiv } from '../helpers/domManipulationHelpers.js';
import { validateRequiredFields, extractFormFieldValues } from '../helpers/formValidationHelpers.js';
import { initializeI18n, getMessage } from '../helpers/internationalizationHelper.js';
import {
    ELEMENT_IDS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STATUS_MESSAGES,
    USER_MESSAGES,
    ACTIONS,
    STATUS_TYPES,
    CSS_CLASSES,
    CONSOLE_MESSAGES,
    TIMEOUTS,
    URL_TEMPLATES,
    ELEMENT_IDS as EXT_ELEMENT_IDS // Alias to avoid conflict if mock data has 'ELEMENT_IDS'
} from '../shared/presetConstants.js';

// Mocked data (moved from demoReportService.js)
const mockJiraData = {
    expand: 'schema,names',
    startAt: 0,
    maxResults: 50,
    total: 9,
    issues: [
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4557884',
            self: 'https://jira.dell.com/rest/api/2/issue/4557884',
            key: 'DDSTM-18876',
            fields: {
                summary: 'Message bar close icon inconsistency',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: {
                    self: 'https://jira.dell.com/rest/api/2/resolution/10101',
                    id: '10101',
                    description: 'This issue is waiting to Deploy and is thus "Done" even though there is one transition remaining.',
                    name: 'Waiting',
                },
                updated: '2025-07-07T08:47:25.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10011',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'Waiting to Deploy',
                    id: '10011',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/3',
                        id: 3,
                        key: 'done',
                        colorName: 'success',
                        name: 'Done',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4556926',
            self: 'https://jira.dell.com/rest/api/2/issue/4556926',
            key: 'DDSTM-18860',
            fields: {
                summary: 'Clean up SASS errors in the console',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-07-03T08:51:59.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10004',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'Proposed',
                    id: '10004',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/2',
                        id: 2,
                        key: 'new',
                        colorName: 'default',
                        name: 'To Do',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4436903',
            self: 'https://jira.dell.com/rest/api/2/issue/4436903',
            key: 'DDSTM-18604',
            fields: {
                summary: 'Update to Angular 17 | SB7 extensive testing',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-07-01T09:22:52.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10008',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'In Functional Test',
                    id: '10008',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/4',
                        id: 4,
                        key: 'indeterminate',
                        colorName: 'inprogress',
                        name: 'In Progress',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4376610',
            self: 'https://jira.dell.com/rest/api/2/issue/4376610',
            key: 'DDSTM-18440',
            fields: {
                summary: 'Update multi-version pipeline',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: {
                    self: 'https://jira.dell.com/rest/api/2/resolution/10000',
                    id: '10000',
                    description: 'Work has been completed on this issue.',
                    name: 'Done',
                },
                updated: '2025-06-26T14:52:36.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10012',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'Complete',
                    id: '10012',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/3',
                        id: 3,
                        key: 'done',
                        colorName: 'success',
                        name: 'Done',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4376608',
            self: 'https://jira.dell.com/rest/api/2/issue/4376608',
            key: 'DDSTM-18439',
            fields: {
                summary: 'Update "How to use storybook" page',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-07-01T09:22:53.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10008',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'In Functional Test',
                    id: '10008',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/4',
                        id: 4,
                        key: 'indeterminate',
                        colorName: 'inprogress',
                        name: 'In Progress',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4244072',
            self: 'https://jira.dell.com/rest/api/2/issue/4244072',
            key: 'DDSTM-18184',
            fields: {
                summary: 'Add guidance about the angular update',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: {
                    self: 'https://jira.dell.com/rest/api/2/resolution/10000',
                    id: '10000',
                    description: 'Work has been completed on this issue.',
                    name: 'Done',
                },
                updated: '2025-05-26T08:55:12.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10012',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'Complete',
                    id: '10012',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/3',
                        id: 3,
                        key: 'done',
                        colorName: 'success',
                        name: 'Done',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '4103677',
            self: 'https://jira.dell.com/rest/api/2/issue/4103677',
            key: 'DDSTM-17859',
            fields: {
                summary: 'POC | Tree shaking with Angular 17',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-06-26T15:02:56.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10005',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'Defining Details',
                    id: '10005',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/4',
                        id: 4,
                        key: 'indeterminate',
                        colorName: 'inprogress',
                        name: 'In Progress',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '3916279',
            self: 'https://jira.dell.com/rest/api/2/issue/3916279',
            key: 'DDSTM-17417',
            fields: {
                summary: 'Update to Angular 17 | SB7',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-07-01T09:22:51.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10008',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'In Functional Test',
                    id: '10008',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/4',
                        id: 4,
                        key: 'indeterminate',
                        colorName: 'inprogress',
                        name: 'In Progress',
                    },
                },
            },
        },
        {
            expand: 'operations,versionedRepresentations,editmeta,changelog,renderedFields',
            id: '3620918',
            self: 'https://jira.dell.com/rest/api/2/issue/3620918',
            key: 'DDSTM-16804',
            fields: {
                summary: 'Angular | Update Angular and storybook versions',
                fixVersions: [
                    {
                        self: 'https://jira.dell.com/rest/api/2/version/57550',
                        id: '57550',
                        name: 'DDS Angular 2.26.0',
                        archived: false,
                        released: false,
                    },
                ],
                resolution: null,
                updated: '2025-06-25T12:28:21.000-0500',
                status: {
                    self: 'https://jira.dell.com/rest/api/2/status/10007',
                    description: '',
                    iconUrl: 'https://jira.dell.com/images/icons/statuses/generic.png',
                    name: 'In Development',
                    id: '10007',
                    statusCategory: {
                        self: 'https://jira.dell.com/rest/api/2/statuscategory/4',
                        id: 4,
                        key: 'indeterminate',
                        colorName: 'inprogress',
                        name: 'In Progress',
                    },
                },
            },
        },
    ],
};

const mockGitlabTagData = [
    {
        name: 'v2.25.5',
        message: '',
        target: '5dbb261c4466474d4882610897f726b7234f910d',
        commit: {
            id: '5dbb261c4466474d4882610897f726b7234f910d',
            short_id: '5dbb261c',
            created_at: '2025-06-26T16:34:40.000-03:00',
            parent_ids: ['e32e325812587b3b3c6fd802884a1a437fd2c0b8'],
            title: 'chore: update changelog',
            message: 'chore: update changelog\n',
            author_name: 'Vitor_hugo_Maldaner',
            author_email: 'vitorhugo.maldanerco@dell.com',
            authored_date: '2025-06-26T16:34:40.000-03:00',
            committer_name: 'Vitor_hugo_Maldaner',
            committer_email: 'vitorhugo.maldanerco@dell.com',
            committed_date: '2025-06-26T16:34:40.000-03:00',
            trailers: {},
            extended_trailers: {},
            web_url:
                'https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/5dbb261c4466474d4882610897f726b7234f910d',
        },
        release: {
            tag_name: 'v2.25.5',
            description:
                '### [2.25.5](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/compare/v2.25.4...v2.25.5) (2025-06-26)\n\n### Bug Fixes\n\n* **badge** update ngOnChanges to correctly update sizes and icons ([b90c2661](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/604a5b88b4fefc6bd277ecf78792685aaaea6826))\n* **breadcrumb** allow the localization object to be a partial ([9af67738](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/715f9caf601fc814a639a3a3a9ab925853f9eed6))\n* **card** handle the header icon, icon type and icon position on ngOnChanges ([e5d6bcf6](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/b83aaeb375b63bf94e6ddbeea4792514108dc646))\n* **carousel:** add check to reset active slide index when the number of items changes ([6e354e8](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/6e354e865f6d5ced2c4f8bbab339eef4b2d66358))\n* **date-picker:** datepicker placeholder overflowing in sm ([17a02a4](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/17a02a43b2f874926631c556215a5e4a49b69376))\n* **drawer:** adding correct title heading styles ([5d62263](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/5d622631edce185e5dd9b382a5e01afb9501b473))\n* **drawer:** handle localization in ngOnChanges ([67ee7354](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/67ee73540dc4d218f18d13eabb0da79f08114724))\n* **dropdown:** ensure the selected options tag inherits the inactive state from the dropdown ([ec5acef](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/ec5acefddb29f71f36ec6e2f44d6a19720fcfbc8))\n* **dropdown:** error when searching with no values returned ([19ff868](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/19ff8684f7d7e6ffbf14759f54d94b55bb3d4d0e))\n* **file-input:** storybook accepted files prop ([6085d30](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/6085d304d7a7ca480845797513be7fabd34e8522))\n* **icon:** icon being duplicated ([6ba0e383](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/6ba0e38368acbabc4007b10dc201016a793833f1))\n* **message-bar:** update default value of localization srCloseButton text ([230b9e2](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/230b9e2f2a01a2b46f30d935fdbe3c65723e147b))\n* **modal:** update the modal to use the OnPush strategy ([c76725a](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/c76725ac9ab22de96aaab4bd59899b41909c0e86))\n* **notification:** notification icon changes ([bfb43d89](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/bfb43d898460d016bf7e784b4a26d76ab72afca1))\n* **side-nav:** dynamic rendering ([76ec583](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/76ec583e8c36b2119127c9a0224ef628c0e6ff58))\n* **side-nav:** should expand group when child item starts selected ([1c185c2](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/1c185c2513159c43e529dc1078359d6586aab2ed))\n* **table:** adjusting loading height when using sticky-header and data-source ([878930f](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/878930f27f919c9a8ef975845d331015213cabc6))\n* **table:** refreshing after dynamic pin update ([7082720](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/708272086f58a7cf207619caab91aa3ee8c537b8))\n* **table:** removing no rows template from ribbon ([6f5beeb](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/6f5beeb37b8c085bf8917069a44af671fda0f67b))\n* **table:** table data updates reflect correctly in pagination when reducing the number of pages ([d6c7fe1](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/d6c7fe1899135fca00644bc46744e1f3af175095))\n* **text-area:** adjust text overlapping error icon ([918dda3](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/918dda3cfa3dbee6392c06ea481d88256b1ad971))\n\n### Documentation\n\n* **foundations:** update documentation and grammar fixes ([5a560b8](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/5a560b839cbfbeff3951db2e2009dabbff7252cd))\n* **getting-started:** remove strict-ssl guidance and add troubleshooting paragraph to npm installation section ([9503009](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/950300925113cc53a61257fd6762ff81a15451ae))\n* **notification:** fix \"add notification\" button in the docs page ([33b98cd](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/33b98cda6bcc2258c0abfb4a5a8ae84b7f6223cf))\n* **table:** add a note to provide guidance on the data-source function declaration ([47bf07d](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/47bf07d3cf077214772d4fce78e23da64e9c2eab))\n* **text-input:** correct missing code snippet ([c4c3058](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/c4c3058beab4ba79e678205cca0490f6ad59db60))',
        },
        protected: true,
        created_at: null,
    },
    {
        name: 'v2.25.4',
        message: '',
        target: '827bb2ee7872e3bc06914cf42ab4b7996a966e0f',
        commit: {
            id: '827bb2ee7872e3bc06914cf42ab4b7996a966e0f',
            short_id: '827bb2ee',
            created_at: '2025-05-07T14:22:04.000-03:00',
            parent_ids: ['d68a580a15d531d582969a6f9f9e036f3104d9be'],
            title: 'chore: add missing items to the changelog',
            message: 'chore: add missing items to the changelog\n',
            author_name: 'Vitor_hugo_Maldaner',
            author_email: 'vitorhugo.maldanerco@dell.com',
            authored_date: '2025-05-07T14:22:04.000-03:00',
            committer_name: 'Vitor_hugo_Maldaner',
            committer_email: 'vitorhugo.maldanerco@dell.com',
            committed_date: '2025-05-07T14:22:04.000-03:00',
            trailers: {},
            extended_trailers: {},
            web_url:
                'https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/827bb2ee7872e3bc06914cf42ab4b7996a966e0f',
        },
        release: {
            tag_name: 'v2.25.4',
            description:
                '### [2.25.4](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/compare/v2.25.3...v2.25.4) (2025-05-07)\n\n\n### Bug Fixes\n\n* **accordion:** adjusting chevron icon when item starts expanded ([a40db5d](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/a40db5de037ff78cd5cc2875daed6293d0ce8325))\n* **dropdown:** ensure the option-select event has the correct value on tag dismiss ([2790e85](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/2790e85d3431272786aad1a824db0ef811ba417b))\n* **scss**: fix scss deprecation warning ([11256637](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/112566375767c2e2fb449fc865f7ad2ad7c6d1cc))\n* **search:** search clear button not refocusing in the search input ([eac7251](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/eac7251f8e8aa187d14641bc5b27a18fa7445daa))\n* **side-nav:** emit expanded event when a nav item is clicked ([0840726](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/0840726f5c6308a647ff138d50d544bfcdced046))\n\n\n### Documentation\n\n* **tag:** add brackets to dismissible prop in code snippet ([7de403b](https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-2.0-angular/commit/7de403b39872398f8075debf03381776f6550374))',
        },
        protected: true,
        created_at: null,
    },
    // ... (rest of the GitLab tag data, truncated for brevity)
];

const mockGitlabCommitData = [
    {
        id: '5dbb261c4466474d4882610897f726b7234f910d',
        short_id: '5dbb261c',
        created_at: '2025-06-26T16:34:40.000-03:00',
        parent_ids: ['e32e325812587b3b3c6fd802884a1a437fd2c0b8'],
        title: 'chore: update changelog',
        message: 'chore: update changelog\n',
        author_name: 'Vitor_hugo_Maldaner',
        author_email: 'vitorhugo.maldanerco@dell.com',
        authored_date: '2025-06-26T16:34:40.000-03:00',
        committer_name: 'Vitor_hugo_Maldaner',
        committer_email: 'vitorhugo.maldanerco@dell.com',
        committed_date: '2025-06-26T16:34:40.000-03:00',
        trailers: {},
        extended_trailers: {},
        web_url:
            'https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/5dbb261c4466474d4882610897f726b7234f910d',
    },
    {
        id: 'e32e325812587b3b3c6fd802884a1a437fd2c0b8',
        short_id: 'e32e3258',
        created_at: '2025-06-26T16:23:44.000-03:00',
        parent_ids: ['93622b48ab85825f54080dcf3795715d5da40550'],
        title: 'chore(release): 2.25.5',
        message: 'chore(release): 2.25.5\n',
        author_name: 'Vitor_hugo_Maldaner',
        author_email: 'vitorhugo.maldanerco@dell.com',
        authored_date: '2025-06-26T16:23:44.000-03:00',
        committer_name: 'Vitor_hugo_Maldaner',
        committer_email: 'vitorhugo.maldanerco@dell.com',
        committed_date: '2025-06-26T16:23:44.000-03:00',
        trailers: {},
        extended_trailers: {},
        web_url:
            'https://gitlab.dell.com/dao/dell-digital-design/design-language-system/systems/dds-angular/-/commit/e32e325812587b3b3c6fd802884a1a437fd2c0b8',
    },
    // ... (rest of the GitLab commit data, truncated for brevity)
];


class ExtensionUIManager {
    constructor() {
        this.initializeI18n();
        this.setupElementReferences();
        this.setupEventListeners();
        this.loadFormValuesFromStorage();
        this.loadAndApplyTheme(); // Added this line
    }

    async loadAndApplyTheme() {
        try {
            const theme = await loadThemePreference();
            if (theme) {
                document.body.dataset.theme = theme;
            } else {
                // If no theme is saved, default to light or try to use system preference
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.dataset.theme = prefersDark ? 'dark' : 'light';
            }
        } catch (error) {
            console.error(CONSOLE_MESSAGES.THEME_LOAD_ERROR, error);
            document.body.dataset.theme = 'light'; // Fallback to light theme
        }
    }

    initializeI18n() {
        initializeI18n();
    }

    setupElementReferences() {
        this.elements = {
            generateSummaryBtn: document.getElementById(ELEMENT_IDS.GENERATE_SUMMARY_BTN),
            getVersionsBtn: document.getElementById(ELEMENT_IDS.GET_VERSIONS_BTN),
            loadingSpinner: document.getElementById(ELEMENT_IDS.LOADING_SPINNER),
            statusMessageDiv: document.getElementById(ELEMENT_IDS.STATUS_MESSAGE),
            summaryResultsDiv: document.getElementById(ELEMENT_IDS.SUMMARY_RESULTS),
            versionsDatalist: document.getElementById(ELEMENT_IDS.VERSIONS_DATALIST),
            jiraProjectKeyInput: document.getElementById(ELEMENT_IDS.JIRA_PROJECT_KEY),
            jiraFixVersionInput: document.getElementById(ELEMENT_IDS.JIRA_FIX_VERSION),
            gitlabProjectIdInput: document.getElementById(ELEMENT_IDS.GITLAB_PROJECT_ID),
            gitlabCurrentTagInput: document.getElementById(ELEMENT_IDS.GITLAB_CURRENT_TAG),
            gitlabPreviousTagInput: document.getElementById(ELEMENT_IDS.GITLAB_PREVIOUS_TAG),
            jiraTicketsDiv: document.getElementById(ELEMENT_IDS.JIRA_TICKETS),
            gitlabHistoryDiv: document.getElementById(ELEMENT_IDS.GITLAB_HISTORY),
            optionsLink: document.getElementById(ELEMENT_IDS.OPTIONS_LINK),
            viewDemoReportDetails: document.getElementById(ELEMENT_IDS.VIEW_DEMO_REPORT_DETAILS),
            exampleResultsDiv: document.getElementById(ELEMENT_IDS.EXAMPLE_RESULTS),
            jiraTicketsExampleDiv: document.getElementById(ELEMENT_IDS.JIRA_TICKETS_EXAMPLE),
            gitlabCommitsExampleDiv: document.getElementById(ELEMENT_IDS.GITLAB_COMMITS_EXAMPLE),
            gitlabTagsExampleDiv: document.getElementById(ELEMENT_IDS.GITLAB_TAGS_EXAMPLE)
        };

        this.fetchController = null;
        this.debounceTimeout = null;
    }

    setupEventListeners() {
        const { optionsLink, generateSummaryBtn, jiraFixVersionInput, getVersionsBtn } = this.elements;

        this.eventHandlers = new Map([
            ['optionsClick', this.handleOptionsClick.bind(this)],
            ['generateSummary', this.handleGenerateSummary.bind(this)],
            ['versionInput', this.handleVersionInput.bind(this)],
            ['getVersions', this.handleGetVersions.bind(this)],
            ['viewDemoReportToggle', this.handleDemoReportToggle.bind(this)]
        ]);

        optionsLink.addEventListener('click', this.eventHandlers.get('optionsClick'));
        generateSummaryBtn.addEventListener('click', this.eventHandlers.get('generateSummary'));
        jiraFixVersionInput.addEventListener('input', this.eventHandlers.get('versionInput'));
        getVersionsBtn.addEventListener('click', this.eventHandlers.get('getVersions'));
        this.elements.viewDemoReportDetails.addEventListener('toggle', this.eventHandlers.get('viewDemoReportToggle'));
    }

    handleOptionsClick(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    }

    async handleDemoReportToggle(event) {
        if (event.target.open) {
            console.log('View Demo Report details opened');
            // Populate input fields with demo values
            this.elements.jiraProjectKeyInput.value = 'DDSTM';
            this.elements.gitlabProjectIdInput.value = '82150';
            this.elements.jiraFixVersionInput.value = '57550'; // This is the ID
            this.elements.gitlabCurrentTagInput.value = 'v2.25.5';
            this.elements.gitlabPreviousTagInput.value = 'v2.25.4';

            // Save these populated values to storage
            await this.saveFormValuesToStorage();

            // Populate the #exampleResults div
            // This logic will be moved/adapted in the next step
            this.elements.exampleResultsDiv.classList.remove(CSS_CLASSES.HIDDEN); // Should be visible by details open
            // Call population methods here once they are integrated
            await this.populateExampleReport();


        } else {
            console.log('View Demo Report details closed');
            // Optionally clear the demo report content or fields if desired when closed
            // clearElementContent(this.elements.exampleResultsDiv);
        }
    }

    async populateExampleReport() {
        try {
            const jiraData = await this.getDemoJiraData(); // Uses mock data
            this.populateExampleJiraTickets(jiraData);

            const gitlabCommitData = await this.getDemoGitlabCommitData(); // Uses mock data
            this.populateExampleGitlabCommits(gitlabCommitData);

            const gitlabTagData = await this.getDemoGitlabTagData(); // Uses mock data
            this.populateExampleGitlabTags(gitlabTagData);

        } catch (error) {
            console.error("Error populating example report sections:", error);
            const errorMessage = `<p>${getMessage('errorLoadingData')}</p>`;
            if (this.elements.jiraTicketsExampleDiv) this.elements.jiraTicketsExampleDiv.innerHTML = errorMessage;
            if (this.elements.gitlabCommitsExampleDiv) this.elements.gitlabCommitsExampleDiv.innerHTML = errorMessage;
            if (this.elements.gitlabTagsExampleDiv) this.elements.gitlabTagsExampleDiv.innerHTML = errorMessage;
        }
    }

    // --- Demo Data Fetching methods for the class ---
    async getDemoJiraData() {
        return Promise.resolve(mockJiraData);
    }

    async getDemoGitlabTagData() {
        return Promise.resolve(mockGitlabTagData);
    }

    async getDemoGitlabCommitData() {
        return Promise.resolve(mockGitlabCommitData);
    }

    populateExampleJiraTickets(jiraData) {
        clearElementContent(this.elements.jiraTicketsExampleDiv);
        if (jiraData && jiraData.issues && this.elements.jiraTicketsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            jiraData.issues.forEach(issue => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM; // Consider if a different class is needed or if this is okay
                const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace('{key}', issue.key)}" target="_blank" rel="noopener noreferrer">${issue.key}</a></strong>: ${issue.fields.summary} <br> <small>${getMessage('statusLabel')}${issue.fields.status.name}</small>`;
                li.innerHTML = issueHtml;
                ul.appendChild(li);
            });
            this.elements.jiraTicketsExampleDiv.appendChild(ul);
        } else if (this.elements.jiraTicketsExampleDiv) {
            this.elements.jiraTicketsExampleDiv.innerHTML = `<p>${getMessage('noJiraTicketsFound')}</p>`;
        }
    }

    populateExampleGitlabCommits(commitData) {
        clearElementContent(this.elements.gitlabCommitsExampleDiv);
        if (commitData && commitData.length > 0 && this.elements.gitlabCommitsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            const gitlabProjectPath = 'dao/dell-digital-design/design-language-system/systems/dds-angular'; // Example path from mock data context
            commitData.forEach(commit => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM;
                let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', gitlabProjectPath).replace('{commitId}', commit.id)}" target="_blank" rel="noopener noreferrer">${commit.short_id}</a></strong>: ${commit.title}`;
                li.innerHTML = commitHtml;
                ul.appendChild(li);
            });
            this.elements.gitlabCommitsExampleDiv.appendChild(ul);
        } else if (this.elements.gitlabCommitsExampleDiv) {
            this.elements.gitlabCommitsExampleDiv.innerHTML = `<p>${getMessage('noGitLabCommitsFound')}</p>`;
        }
    }

    populateExampleGitlabTags(tagData) {
        clearElementContent(this.elements.gitlabTagsExampleDiv);
        if (tagData && tagData.length > 0 && this.elements.gitlabTagsExampleDiv) {
            const ul = document.createElement('ul');
            ul.className = 'list-style-none p-0';
            tagData.forEach(tag => {
                const li = document.createElement('li');
                li.className = CSS_CLASSES.DISCREPANCY_ITEM;
                let tagHtml = `<strong>${tag.name}</strong>`;
                if (tag.release && tag.release.description) {
                    const releaseDescription = tag.release.description
                        .replace(/\n/g, '<br>')
                        .replace(/### (.*?)\s/g, '<strong>$1</strong><br>')
                        .replace(/\* \*\*(.*?)\*\* (.*?)\((.*?)\)/g, '<li><strong>$1</strong> $2 (<a href="$3" target="_blank" rel="noopener noreferrer">link</a>)</li>')
                        .replace(/\* (.*?)\((.*?)\)/g, '<li>$1 (<a href="$2" target="_blank" rel="noopener noreferrer">link</a>)</li>');
                    tagHtml += `<br><small>Release Notes:</small><div class="release-notes">${releaseDescription}</div>`;
                }
                li.innerHTML = tagHtml;
                ul.appendChild(li);
            });
            this.elements.gitlabTagsExampleDiv.appendChild(ul);
        } else if (this.elements.gitlabTagsExampleDiv) {
            this.elements.gitlabTagsExampleDiv.innerHTML = `<p>${getMessage('noGitLabTagsFound')}</p>`;
        }
    }

    async handleGenerateSummary() {
        const { jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput, statusMessageDiv } = this.elements;

        const [jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag] =
            extractFormFieldValues(jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput);

        const validation = validateRequiredFields({
            jiraProjectKey, jiraFixVersion, gitlabProjectId, gitlabCurrentTag, gitlabPreviousTag
        });

        if (!validation.isValid) {
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FILL_ALL_INPUT_FIELDS), STATUS_TYPES.ERROR);
            return;
        }

        await this.saveFormValuesToStorage();
        this.showLoadingStateAndClearResults();
        displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FETCHING_AND_COMPARING_DATA), STATUS_TYPES.INFO);

        try {
            console.log(CONSOLE_MESSAGES.SENDING_MESSAGE_TO_BACKGROUND);

            const response = await sendMessageToBackgroundScript(ACTIONS.GENERATE_RELEASE_SUMMARY, {
                jiraProjectKey,
                jiraFixVersion,
                gitlabProjectId,
                gitlabCurrentTag,
                gitlabPreviousTag
            });

            console.log(CONSOLE_MESSAGES.RECEIVED_RESPONSE_FROM_BACKGROUND, response);
            this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);

            const messageHandler = {
                true: () => {
                    displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.SUMMARY_GENERATED_SUCCESSFULLY), STATUS_TYPES.SUCCESS);
                    this.displaySummaryResults(response.summary);
                },
                false: () => {
                    displayStatusMessage(statusMessageDiv, `${getMessage('errorPrefix')}${response.message || getMessage('unknownSystemError')}`, STATUS_TYPES.ERROR);
                }
            }[Boolean(response.success)];

            messageHandler();
        } catch (error) {
            this.elements.loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.UNEXPECTED_ERROR_OCCURRED), STATUS_TYPES.ERROR);
            console.error(CONSOLE_MESSAGES.SIDE_PANEL_SCRIPT_ERROR, error);
        }
    }

    handleVersionInput() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.fetchAvailableFixVersions();
        }, TIMEOUTS.DEBOUNCE_DELAY);
    }

    handleGetVersions() {
        this.fetchAvailableFixVersions();
    }

    async fetchAvailableFixVersions() {
        const { jiraProjectKeyInput, statusMessageDiv, loadingSpinner, versionsDatalist } = this.elements;
        const jiraProjectKey = jiraProjectKeyInput.value.trim();

        if (!jiraProjectKey) {
            displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.ENTER_JIRA_PROJECT_KEY_FIRST), STATUS_TYPES.ERROR);
            return;
        }

        this.abortPreviousFetchIfExists();
        this.setupNewFetchController();

        displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FETCHING_AVAILABLE_FIX_VERSIONS), STATUS_TYPES.INFO);
        loadingSpinner.classList.remove(CSS_CLASSES.HIDDEN);

        try {
            const response = await sendMessageToBackgroundScript(ACTIONS.GET_FIX_VERSIONS, { jiraProjectKey });

            if (this.fetchController.signal.aborted) return;

            const resultHandler = {
                true: () => {
                    displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.FIX_VERSIONS_RETRIEVED_SUCCESSFULLY), STATUS_TYPES.SUCCESS);
                    populateDatalistWithOptions(versionsDatalist, response.data);
                },
                false: () => {
                    displayStatusMessage(statusMessageDiv, `${ERROR_MESSAGES.FAILED_TO_GET_FIX_VERSIONS} ${response.message || ERROR_MESSAGES.UNKNOWN_ERROR}`, STATUS_TYPES.ERROR);
                    clearElementContent(versionsDatalist);
                }
            }[Boolean(response.success)];

            resultHandler();
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayStatusMessage(statusMessageDiv, getMessage(USER_MESSAGES.ERROR_GETTING_FIX_VERSIONS), STATUS_TYPES.ERROR);
                console.error(CONSOLE_MESSAGES.GET_VERSIONS_ERROR, error);
                clearElementContent(versionsDatalist);
            }
        } finally {
            if (!this.fetchController.signal.aborted) {
                loadingSpinner.classList.add(CSS_CLASSES.HIDDEN);
            }
        }
    }

    displaySummaryResults(summary) {
        const { summaryResultsDiv, jiraTicketsDiv, gitlabHistoryDiv } = this.elements;

        summaryResultsDiv.classList.remove(CSS_CLASSES.HIDDEN);
        clearElementContent(jiraTicketsDiv);
        clearElementContent(gitlabHistoryDiv);

        for (const issue of summary.allJiraIssues) {
            const issueHtml = `<strong><a href="${URL_TEMPLATES.JIRA_ISSUE.replace('{key}', issue.key)}" target="_blank">${issue.key}</a></strong>: ${issue.summary} <br> <small>${getMessage('statusLabel')}${issue.status}</small>`;
            const issueEl = createDiscrepancyItemDiv(CSS_CLASSES.DISCREPANCY_ITEM, issueHtml);
            jiraTicketsDiv.appendChild(issueEl);
        }

        for (const commit of summary.allGitLabCommits) {
            let commitHtml = `<strong><a href="${URL_TEMPLATES.GITLAB_COMMIT.replace('{projectPath}', summary.gitlabProjectPath).replace('{commitId}', commit.id)}" target="_blank">${commit.short_id}</a></strong>: ${commit.title}`;

            if (commit.jira_keys && commit.jira_keys.length > 0) {
                commitHtml += `<br><small>${getMessage('relatedJiraLabel')}${commit.jira_keys.join(', ')}</small>`;
            }

            const commitEl = createDiscrepancyItemDiv(CSS_CLASSES.DISCREPANCY_ITEM, commitHtml);
            gitlabHistoryDiv.appendChild(commitEl);
        }
    }

    async saveFormValuesToStorage() {
        const { versionsDatalist, jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput } = this.elements;

        const selectedVersion = Array.from(versionsDatalist.options).find(option => option.value === jiraFixVersionInput.value);
        const versionId = selectedVersion ? selectedVersion.dataset.id : jiraFixVersionInput.value;

        const formData = {
            jiraProjectKey: jiraProjectKeyInput.value.trim(),
            jiraFixVersion: versionId,
            gitlabProjectId: gitlabProjectIdInput.value.trim(),
            gitlabCurrentTag: gitlabCurrentTagInput.value.trim(),
            gitlabPreviousTag: gitlabPreviousTagInput.value.trim()
        };

        await saveFormDataToStorage(formData);
    }

    async loadFormValuesFromStorage() {
        const { jiraProjectKeyInput, jiraFixVersionInput, gitlabProjectIdInput, gitlabCurrentTagInput, gitlabPreviousTagInput } = this.elements;

        const data = await loadFormDataFromStorage();

        const formFieldUpdaters = {
            jiraProjectKey: (value) => { if (value) jiraProjectKeyInput.value = value; },
            jiraFixVersion: (value) => { if (value) jiraFixVersionInput.value = value; },
            gitlabProjectId: (value) => { if (value) gitlabProjectIdInput.value = value; },
            gitlabCurrentTag: (value) => { if (value) gitlabCurrentTagInput.value = value; },
            gitlabPreviousTag: (value) => { if (value) gitlabPreviousTagInput.value = value; }
        };

        for (const [field, updater] of Object.entries(formFieldUpdaters)) {
            updater(data[field]);
        }
    }

    showLoadingStateAndClearResults() {
        const { loadingSpinner, summaryResultsDiv } = this.elements;
        loadingSpinner.classList.remove(CSS_CLASSES.HIDDEN);
        summaryResultsDiv.classList.add(CSS_CLASSES.HIDDEN);
    }

    abortPreviousFetchIfExists() {
        if (this.fetchController) {
            this.fetchController.abort();
        }
    }

    setupNewFetchController() {
        this.fetchController = new AbortController();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ExtensionUIManager();
});
