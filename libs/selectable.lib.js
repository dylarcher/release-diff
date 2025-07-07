/**
 * @file dragAndDropHelpers.js
 * @description Modern SortableJS-compatible drag-and-drop functionality for list elements.
 * Recreates the complete SortableJS API using modern JavaScript practices.
 */

// Global registry for all Sortable instances
const sortableInstances = new WeakMap();
let draggedElement = null;
let ghostElement = null;
let cloneElement = null;
let activeSortable = null;
let moveEvent = null;

/**
 * Default options for Sortable instances
 */
const DEFAULT_OPTIONS = {
    group: null,
    sort: true,
    delay: 0,
    delayOnTouchOnly: false,
    touchStartThreshold: 0,
    disabled: false,
    store: null,
    animation: 150,
    easing: 'cubic-bezier(1, 0, 0, 1)',
    handle: null,
    filter: null,
    preventOnFilter: true,
    draggable: null,
    dataIdAttr: 'data-id',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    swapThreshold: 1,
    invertSwap: false,
    invertedSwapThreshold: 1,
    direction: 'vertical',
    forceFallback: false,
    fallbackClass: 'sortable-fallback',
    fallbackOnBody: false,
    fallbackTolerance: 0,
    dragoverBubble: false,
    removeCloneOnHide: true,
    emptyInsertThreshold: 5,
    setData: null,
    onChoose: null,
    onUnchoose: null,
    onStart: null,
    onEnd: null,
    onAdd: null,
    onUpdate: null,
    onSort: null,
    onRemove: null,
    onFilter: null,
    onMove: null,
    onClone: null,
    onChange: null
};

/**
 * Utility functions similar to SortableJS utils
 */
export const Utils = {
    /**
     * Attach an event handler function
     */
    on(element, event, handler) {
        element.addEventListener(event, handler);
    },

    /**
     * Remove an event handler
     */
    off(element, event, handler) {
        element.removeEventListener(event, handler);
    },

    /**
     * Get or set CSS properties
     */
    css(element, prop, value) {
        if (typeof prop === 'string') {
            if (value !== undefined) {
                element.style[prop] = value;
            }
            return getComputedStyle(element)[prop];
        } else if (typeof prop === 'object') {
            Object.assign(element.style, prop);
        }
        return getComputedStyle(element);
    },

    /**
     * Find elements by selector
     */
    find(element, selector) {
        return Array.from(element.querySelectorAll(selector));
    },

    /**
     * Check if element matches selector
     */
    is(element, selector) {
        return element.matches(selector);
    },

    /**
     * Get closest ancestor matching selector
     */
    closest(element, selector, context = document) {
        return element.closest(selector);
    },

    /**
     * Clone an element
     */
    clone(element) {
        return element.cloneNode(true);
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className, state) {
        if (state !== undefined) {
            element.classList.toggle(className, state);
        } else {
            element.classList.toggle(className);
        }
    },

    /**
     * Get element index within parent
     */
    index(element, selector) {
        const parent = element.parentElement;
        if (!parent) return -1;

        const children = selector ?
            Array.from(parent.querySelectorAll(selector)) :
            Array.from(parent.children);

        return children.indexOf(element);
    },

    /**
     * Get child element at index
     */
    getChild(parent, index, options, includeDragEl) {
        const children = Array.from(parent.children);
        const draggableChildren = children.filter(child =>
            !options.draggable || this.is(child, options.draggable)
        );

        if (!includeDragEl && draggedElement && draggableChildren.includes(draggedElement)) {
            const dragIndex = draggableChildren.indexOf(draggedElement);
            if (dragIndex < index) index++;
        }

        return draggableChildren[index] || null;
    },

    /**
     * Detect direction of container
     */
    detectDirection(element) {
        const children = Array.from(element.children);
        if (children.length < 2) return 'vertical';

        const first = children[0].getBoundingClientRect();
        const second = children[1].getBoundingClientRect();

        return Math.abs(first.top - second.top) > Math.abs(first.left - second.left) ?
            'vertical' : 'horizontal';
    }
};

/**
 * Main Sortable class
 */
export class Sortable {
    constructor(element, options = {}) {
        this.el = element;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.dragStartTimer = null;
        this.touchStartTimer = null;
        this.isDestroyed = false;

        // Bind event handlers
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragEnter = this.handleDragEnter.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        this.init();

        // Register instance
        sortableInstances.set(element, this);
    }

    init() {
        if (this.options.disabled) return;

        this.setupDragAndDrop();
        this.setupTouchEvents();
        this.setupMouseEvents();

        // Apply initial classes
        this.el.classList.add('sortable');

        // Set up draggable attributes
        this.updateDraggableElements();
    }

    setupDragAndDrop() {
        Utils.on(this.el, 'dragstart', this.handleDragStart);
        Utils.on(this.el, 'dragend', this.handleDragEnd);
        Utils.on(this.el, 'dragover', this.handleDragOver);
        Utils.on(this.el, 'dragenter', this.handleDragEnter);
        Utils.on(this.el, 'dragleave', this.handleDragLeave);
        Utils.on(this.el, 'drop', this.handleDrop);
    }

    setupTouchEvents() {
        Utils.on(this.el, 'touchstart', this.handleTouchStart);
        Utils.on(this.el, 'touchmove', this.handleTouchMove);
        Utils.on(this.el, 'touchend', this.handleTouchEnd);
    }

    setupMouseEvents() {
        Utils.on(this.el, 'mousedown', this.handleMouseDown);
    }

    updateDraggableElements() {
        const selector = this.options.draggable || '> *';
        const elements = this.el.querySelectorAll(selector);

        elements.forEach(element => {
            element.draggable = true;
            element.setAttribute('draggable', 'true');
        });
    }

    handleDragStart(event) {
        if (this.options.disabled) return;

        const target = event.target;
        if (!this.isDraggable(target)) return;

        // Check for handle
        if (this.options.handle && !Utils.closest(event.target, this.options.handle, target)) {
            return;
        }

        // Check for filter
        if (this.options.filter && Utils.is(event.target, this.options.filter)) {
            this.triggerEvent('onFilter', { item: target });
            if (this.options.preventOnFilter) {
                event.preventDefault();
            }
            return;
        }

        draggedElement = target;
        activeSortable = this;

        // Apply chosen class
        target.classList.add(this.options.chosenClass);

        // Create ghost
        this.createGhost(target);

        // Set data transfer
        if (this.options.setData) {
            this.options.setData(event.dataTransfer, target);
        } else {
            event.dataTransfer.setData('text/plain', target.textContent);
        }

        // Trigger events
        this.triggerEvent('onChoose', { item: target });

        setTimeout(() => {
            target.classList.add(this.options.dragClass);
            this.triggerEvent('onStart', { item: target });
        }, 0);
    }

    handleDragEnd(event) {
        if (!draggedElement) return;

        const target = event.target;

        // Remove classes
        target.classList.remove(this.options.chosenClass);
        target.classList.remove(this.options.dragClass);

        // Remove ghost
        this.removeGhost();

        // Trigger events
        this.triggerEvent('onUnchoose', { item: target });
        this.triggerEvent('onEnd', { item: target });

        // Clean up
        draggedElement = null;
        activeSortable = null;
        moveEvent = null;
    }

    handleDragOver(event) {
        if (!draggedElement) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const target = this.getDragOverTarget(event);
        if (!target) return;

        // Create move event
        moveEvent = this.createMoveEvent(event, target);

        // Trigger onMove
        if (this.options.onMove) {
            const result = this.options.onMove(moveEvent, event);
            if (result === false) return;
        }

        // Perform the move
        this.performMove(target, event);
    }

    handleDragEnter(event) {
        event.preventDefault();
    }

    handleDragLeave(event) {
        // Handle drag leave logic
    }

    handleDrop(event) {
        if (!draggedElement) return;

        event.preventDefault();
        event.stopPropagation();

        const target = this.getDragOverTarget(event);
        if (target) {
            this.completeDrop(target, event);
        }
    }

    // Touch event handlers
    handleTouchStart(event) {
        if (this.options.disabled) return;

        const target = event.target;
        if (!this.isDraggable(target)) return;

        // Handle delay
        if (this.options.delay && this.options.delayOnTouchOnly) {
            this.touchStartTimer = setTimeout(() => {
                this.startDrag(target, event);
            }, this.options.delay);
        } else {
            this.startDrag(target, event);
        }
    }

    handleTouchMove(event) {
        if (this.touchStartTimer) {
            clearTimeout(this.touchStartTimer);
            this.touchStartTimer = null;
        }

        if (draggedElement) {
            event.preventDefault();
            this.updateDragPosition(event);
        }
    }

    handleTouchEnd(event) {
        if (this.touchStartTimer) {
            clearTimeout(this.touchStartTimer);
            this.touchStartTimer = null;
        }

        if (draggedElement) {
            this.completeDrag(event);
        }
    }

    // Mouse event handlers
    handleMouseDown(event) {
        if (this.options.disabled) return;

        const target = event.target;
        if (!this.isDraggable(target)) return;

        // Handle delay
        if (this.options.delay && !this.options.delayOnTouchOnly) {
            this.dragStartTimer = setTimeout(() => {
                this.startDrag(target, event);
            }, this.options.delay);
        }
    }

    handleMouseMove(event) {
        if (this.dragStartTimer) {
            clearTimeout(this.dragStartTimer);
            this.dragStartTimer = null;
        }
    }

    handleMouseUp(event) {
        if (this.dragStartTimer) {
            clearTimeout(this.dragStartTimer);
            this.dragStartTimer = null;
        }
    }

    // Touch and mouse helper methods
    startDrag(target, event) {
        if (!this.isDraggable(target)) return;

        draggedElement = target;
        activeSortable = this;

        // Apply chosen class
        target.classList.add(this.options.chosenClass);

        // Trigger events
        this.triggerEvent('onChoose', { item: target });

        setTimeout(() => {
            target.classList.add(this.options.dragClass);
            this.triggerEvent('onStart', { item: target });
        }, 0);
    }

    updateDragPosition(event) {
        // Handle touch/mouse drag position updates
        const touch = event.touches ? event.touches[0] : event;
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

        if (elementBelow) {
            const target = Utils.closest(elementBelow, this.options.draggable || '> *', this.el);
            if (target && target !== draggedElement) {
                this.performMove(target, event);
            }
        }
    }

    completeDrag(event) {
        if (!draggedElement) return;

        // Remove classes
        draggedElement.classList.remove(this.options.chosenClass);
        draggedElement.classList.remove(this.options.dragClass);

        // Remove ghost
        this.removeGhost();

        // Trigger events
        this.triggerEvent('onUnchoose', { item: draggedElement });
        this.triggerEvent('onEnd', { item: draggedElement });

        // Clean up
        draggedElement = null;
        activeSortable = null;
        moveEvent = null;
    }

    // Helper methods
    isDraggable(element) {
        if (!element || element === this.el) return false;

        const selector = this.options.draggable || '> *';
        return element.matches(selector) || Utils.closest(element, selector, this.el);
    }

    createGhost(element) {
        ghostElement = element.cloneNode(true);
        ghostElement.classList.add(this.options.ghostClass);
        ghostElement.style.opacity = '0.4';
        ghostElement.style.pointerEvents = 'none';

        // Insert ghost
        element.parentNode.insertBefore(ghostElement, element.nextSibling);
    }

    removeGhost() {
        if (ghostElement) {
            ghostElement.remove();
            ghostElement = null;
        }
    }

    getDragOverTarget(event) {
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        return Utils.closest(elementBelow, this.options.draggable || '> *', this.el);
    }

    createMoveEvent(event, target) {
        const rect = target.getBoundingClientRect();
        const direction = this.getDirection();

        return {
            to: this.el,
            from: activeSortable ? activeSortable.el : null,
            dragged: draggedElement,
            draggedRect: draggedElement.getBoundingClientRect(),
            related: target,
            relatedRect: rect,
            willInsertAfter: this.willInsertAfter(event, target, direction)
        };
    }

    performMove(target, event) {
        const direction = this.getDirection();
        const insertAfter = this.willInsertAfter(event, target, direction);

        if (insertAfter) {
            target.parentNode.insertBefore(draggedElement, target.nextSibling);
        } else {
            target.parentNode.insertBefore(draggedElement, target);
        }

        // Animate if enabled
        if (this.options.animation) {
            this.animateMove(draggedElement);
        }

        // Update ghost position
        if (ghostElement) {
            ghostElement.remove();
            this.createGhost(draggedElement);
        }
    }

    willInsertAfter(event, target, direction) {
        const rect = target.getBoundingClientRect();
        const threshold = this.options.swapThreshold;

        if (direction === 'vertical') {
            const centerY = rect.top + rect.height / 2;
            return event.clientY > centerY;
        } else {
            const centerX = rect.left + rect.width / 2;
            return event.clientX > centerX;
        }
    }

    getDirection() {
        if (typeof this.options.direction === 'function') {
            return this.options.direction(moveEvent, draggedElement);
        }
        return this.options.direction === 'horizontal' ? 'horizontal' : 'vertical';
    }

    animateMove(element) {
        if (!this.options.animation) return;

        element.style.transition = `transform ${this.options.animation}ms ${this.options.easing}`;

        // Reset transition after animation
        setTimeout(() => {
            element.style.transition = '';
        }, this.options.animation);
    }

    completeDrop(target, event) {
        const oldIndex = this.getElementIndex(draggedElement);
        const newIndex = this.getElementIndex(target);

        // Trigger appropriate events
        if (activeSortable === this) {
            this.triggerEvent('onUpdate', {
                item: draggedElement,
                oldIndex,
                newIndex
            });
        } else {
            this.triggerEvent('onAdd', {
                item: draggedElement,
                oldIndex,
                newIndex
            });
        }

        this.triggerEvent('onSort', {
            item: draggedElement,
            oldIndex,
            newIndex
        });

        // Save if store is configured
        if (this.options.store && this.options.store.set) {
            this.options.store.set(this);
        }
    }

    getElementIndex(element) {
        const parent = element.parentElement;
        if (!parent) return -1;

        const children = Array.from(parent.children);
        return children.indexOf(element);
    }

    triggerEvent(eventName, data) {
        const callback = this.options[eventName];
        if (callback && typeof callback === 'function') {
            callback({
                ...data,
                to: this.el,
                from: activeSortable ? activeSortable.el : null
            });
        }
    }

    // Public API methods
    option(name, value) {
        if (value !== undefined) {
            this.options[name] = value;

            // Handle specific option changes
            if (name === 'disabled') {
                this.options.disabled ? this.disable() : this.enable();
            } else if (name === 'draggable') {
                this.updateDraggableElements();
            }

            return this;
        }
        return this.options[name];
    }

    toArray() {
        const selector = this.options.draggable || '> *';
        const elements = this.el.querySelectorAll(selector);
        return Array.from(elements).map(el => el.getAttribute(this.options.dataIdAttr) || '');
    }

    sort(order, useAnimation = false) {
        const elements = Array.from(this.el.children);
        const elementMap = new Map();

        elements.forEach(el => {
            const id = el.getAttribute(this.options.dataIdAttr);
            if (id) elementMap.set(id, el);
        });

        const fragment = document.createDocumentFragment();
        order.forEach(id => {
            const element = elementMap.get(id);
            if (element) {
                fragment.appendChild(element);
            }
        });

        if (useAnimation && this.options.animation) {
            // Animate the sort
            const oldPositions = elements.map(el => ({
                element: el,
                rect: el.getBoundingClientRect()
            }));

            this.el.appendChild(fragment);

            oldPositions.forEach(({ element, rect }) => {
                const newRect = element.getBoundingClientRect();
                const deltaX = rect.left - newRect.left;
                const deltaY = rect.top - newRect.top;

                element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                element.style.transition = 'none';
            });

            requestAnimationFrame(() => {
                oldPositions.forEach(({ element }) => {
                    element.style.transform = '';
                    element.style.transition = `transform ${this.options.animation}ms ${this.options.easing}`;
                });

                setTimeout(() => {
                    oldPositions.forEach(({ element }) => {
                        element.style.transition = '';
                    });
                }, this.options.animation);
            });
        } else {
            this.el.appendChild(fragment);
        }
    }

    save() {
        if (this.options.store && this.options.store.set) {
            this.options.store.set(this);
        }
    }

    closest(element, selector) {
        return Utils.closest(element, selector, this.el);
    }

    enable() {
        this.options.disabled = false;
        this.el.classList.remove('sortable-disabled');
    }

    disable() {
        this.options.disabled = true;
        this.el.classList.add('sortable-disabled');
    }

    destroy() {
        if (this.isDestroyed) return;

        // Remove event listeners
        Utils.off(this.el, 'dragstart', this.handleDragStart);
        Utils.off(this.el, 'dragend', this.handleDragEnd);
        Utils.off(this.el, 'dragover', this.handleDragOver);
        Utils.off(this.el, 'dragenter', this.handleDragEnter);
        Utils.off(this.el, 'dragleave', this.handleDragLeave);
        Utils.off(this.el, 'drop', this.handleDrop);
        Utils.off(this.el, 'touchstart', this.handleTouchStart);
        Utils.off(this.el, 'touchmove', this.handleTouchMove);
        Utils.off(this.el, 'touchend', this.handleTouchEnd);
        Utils.off(this.el, 'mousedown', this.handleMouseDown);

        // Clear timers
        if (this.dragStartTimer) {
            clearTimeout(this.dragStartTimer);
        }
        if (this.touchStartTimer) {
            clearTimeout(this.touchStartTimer);
        }

        // Remove classes
        this.el.classList.remove('sortable');
        this.el.classList.remove('sortable-disabled');

        // Remove draggable attributes
        const elements = this.el.querySelectorAll('[draggable="true"]');
        elements.forEach(el => {
            el.removeAttribute('draggable');
        });

        // Remove from registry
        sortableInstances.delete(this.el);

        this.isDestroyed = true;
    }

    // Static methods
    static create(element, options) {
        return new Sortable(element, options);
    }

    static get(element) {
        return sortableInstances.get(element) || null;
    }

    static get active() {
        return activeSortable;
    }

    static get dragged() {
        return draggedElement;
    }

    static get ghost() {
        return ghostElement;
    }

    static get clone() {
        return cloneElement;
    }

    static get utils() {
        return Utils;
    }
}

// Export for compatibility with existing code
export function initializeDragAndDrop(container, options = {}) {
    // Check if already initialized
    if (sortableInstances.has(container)) {
        return sortableInstances.get(container);
    }

    // Create new Sortable instance
    return Sortable.create(container, options);
}


/**
 * Default configuration for GitLab items
 */
export const GitLabItemsConfig = {
    group: 'gitlab-items',
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    handle: '.drag-handle',
    filter: '.no-drag',
    onStart: function (evt) {
        console.info('Started dragging GitLab item:', evt.item);
    },
    onEnd: function (evt) {
        console.info('Finished dragging GitLab item:', evt.item);
        console.info('Moved from index', evt.oldIndex, 'to index', evt.newIndex);
    }
};

/**
 * Configuration for Jira dropzone cards
 */
export const JiraDropzoneConfig = {
    group: 'jira-items',
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.no-drag',
    onAdd: function (evt) {
        console.log('Item added to Jira dropzone:', evt.item);
    },
    onRemove: function (evt) {
        console.log('Item removed from Jira dropzone:', evt.item);
    }
};

/**
 * Configuration for cross-list dragging between GitLab and Jira
 */
export const CrossListConfig = {
    group: 'cross-list',
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onMove: function (evt) {
        // Custom logic for cross-list validation
        const fromContainer = evt.from;
        const toContainer = evt.to;

        // Check if move is allowed
        if (fromContainer.classList.contains('gitlab-container') &&
            toContainer.classList.contains('jira-container')) {
            return true; // Allow GitLab to Jira
        }

        return false; // Block other combinations
    },
    onEnd: function (evt) {
        // Save state after cross-list drag
        saveCurrentState();
    }
};

/**
 * Configuration with auto-scroll for long lists
 */
export const AutoScrollConfig = {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 10,
    bubbleScroll: true
};

/**
 * Configuration for nested sortable lists
 */
export const NestedSortableConfig = {
    group: 'nested',
    animation: 150,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    dragoverBubble: true,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag'
};

/**
 * Helper function to update commit count in Jira cards
 */
function updateCommitCount(jiraCard) {
    const container = jiraCard.querySelector('.associated-commits-container');
    if (container) {
        const commitItems = container.querySelectorAll('.associated-commit-item');
        const countElement = jiraCard.querySelector('.commit-count');

        if (countElement) {
            countElement.textContent = commitItems.length;
        }
    }
}

/**
 * Helper function to save current state
 */
function saveCurrentState() {
    // This would integrate with the existing storage system
    if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
        // Save to Chrome storage
        const state = {
            timestamp: Date.now(),
            gitlabItems: getItemOrder('.gitlab-items-container'),
            jiraAssociations: getJiraAssociations()
        };

        chrome.storage.local.set({ 'sortableState': state });
    }
}

/**
 * Helper function to get item order from a container
 */
function getItemOrder(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return [];

    const sortable = Sortable.get(container);
    return sortable ? sortable.toArray() : [];
}

/**
 * Helper function to get Jira associations
 */
function getJiraAssociations() {
    const associations = {};
    const jiraCards = document.querySelectorAll('.jira-dropzone-card');

    jiraCards.forEach(card => {
        const jiraId = card.dataset.itemId;
        const container = card.querySelector('.associated-commits-container');

        if (container) {
            const sortable = Sortable.get(container);
            associations[jiraId] = sortable ? sortable.toArray() : [];
        }
    });

    return associations;
}

/**
 * Initialize sortable with common error handling
 */
export function initializeSortableWithConfig(container, config) {
    try {
        if (!container) {
            console.warn('Cannot initialize sortable: container is null');
            return null;
        }

        // Check if already initialized
        const existing = Sortable.get(container);
        if (existing) {
            console.info('Sortable already initialized for container:', container);
            return existing;
        }

        // Create new sortable instance
        const sortable = Sortable.create(container, config);
        console.info('Initialized sortable for container:', container);

        return sortable;
    } catch (error) {
        console.error('Error initializing sortable:', error);
        return null;
    }
}

/**
 * Batch initialize multiple sortables
 */
export function initializeMultipleSortables(configs) {
    const instances = [];

    configs.forEach(({ selector, config }) => {
        const containers = document.querySelectorAll(selector);

        containers.forEach(container => {
            const instance = initializeSortableWithConfig(container, config);
            if (instance) {
                instances.push(instance);
            }
        });
    });

    return instances;
}

/**
 * Clean up all sortables
 */
export function destroyAllSortables() {
    const containers = document.querySelectorAll('.sortable');

    containers.forEach(container => {
        const sortable = Sortable.get(container);
        if (sortable) {
            sortable.destroy();
        }
    });
}

// Export the main class and utilities
export default Sortable;
