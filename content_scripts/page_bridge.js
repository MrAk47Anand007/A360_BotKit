(() => {
    if (window.__A360_BOTKIT_PAGE_BRIDGE_LOADED__) {
        return;
    }
    window.__A360_BOTKIT_PAGE_BRIDGE_LOADED__ = true;

    const REQUEST_EVENT = 'A360_BOTKIT_PAGE_REQUEST';
    const RESPONSE_EVENT = 'A360_BOTKIT_PAGE_RESPONSE';

    function getEditorRoot() {
        return document.querySelector('[data-path="EditorPage"]');
    }

    function getTaskbotEditPageInstance() {
        const editorRoot = getEditorRoot();
        if (!editorRoot) {
            throw new Error('EditorPage not found');
        }

        const fiberKey = Object.keys(editorRoot).find((key) => key.startsWith('__reactFiber$'));
        if (!fiberKey) {
            throw new Error('React fiber not found');
        }

        let fiber = editorRoot[fiberKey];
        while (fiber) {
            const typeName =
                fiber.type?.displayName ||
                fiber.type?.name ||
                fiber.elementType?.displayName ||
                fiber.elementType?.name;

            if (typeName === 'TaskbotEditPage') {
                return fiber.stateNode;
            }

            fiber = fiber.return;
        }

        throw new Error('TaskbotEditPage instance not found');
    }

    function toPlain(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getCurrentFormValues(instance) {
        if (typeof instance?.props?.getFormValues !== 'function') {
            throw new Error('getFormValues is unavailable');
        }

        const formName = instance.props.form || 'taskbot';
        const formValues = instance.props.getFormValues(formName);
        if (!formValues) {
            throw new Error('Current form values are unavailable');
        }

        return formValues;
    }

    function extractSavePayload() {
        const instance = getTaskbotEditPageInstance();
        const formValues = getCurrentFormValues(instance);

        if (typeof instance.getContent !== 'function') {
            throw new Error('getContent is unavailable');
        }

        const built = instance.getContent(formValues);
        return {
            dirty: Boolean(instance.props?.dirty || instance.state?.dirty),
            fileId: instance.props?.automationFile?.id || null,
            payload: toPlain(built),
        };
    }

    function markSaved() {
        const instance = getTaskbotEditPageInstance();
        const formValues = getCurrentFormValues(instance);

        let initialized = false;
        if (typeof instance?.props?.initialize === 'function') {
            instance.props.initialize(formValues);
            initialized = true;
        }

        if (typeof instance?.setState === 'function' && typeof instance?.state?.dirty === 'number' && instance.state.dirty !== 0) {
            instance.setState({dirty: 0});
        }

        const editorRoot = getEditorRoot();
        if (editorRoot) {
            editorRoot.setAttribute('data-page-dirty', 'false');
            editorRoot.setAttribute('data-page-working', 'false');
        }

        if (typeof instance?.forceUpdate === 'function') {
            setTimeout(() => instance.forceUpdate(), 0);
        }

        return {
            initialized,
            dirty: Boolean(instance.props?.dirty || instance.state?.dirty),
        };
    }

    window.addEventListener(REQUEST_EVENT, (event) => {
        const detail = event.detail || {};
        const {requestId, action} = detail;

        if (!requestId || !action) {
            return;
        }

        try {
            let data;
            switch (action) {
                case 'extract-save-payload':
                    data = extractSavePayload();
                    break;
                case 'mark-saved':
                    data = markSaved();
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }

            window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
                detail: {
                    requestId,
                    ok: true,
                    data,
                }
            }));
        } catch (error) {
            window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
                detail: {
                    requestId,
                    ok: false,
                    error: error?.message || 'Unknown bridge error',
                }
            }));
        }
    });
})();
