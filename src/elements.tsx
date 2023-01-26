/// <reference path="./jsx/element-types.d.ts" />
/// <reference path="./jsx/events.d.ts" />
/// <reference path="./jsx/intrinsic-elements.d.ts" />

type AttributeValue = number | string | Date | boolean;

export type ContentType = JSX.IRenderNode | string;

export interface CustomElementHandler {
    (attributes: Attributes | undefined, contents: ContentType[]): RenderNode;
}

export interface Attributes {
    [key: string]: AttributeValue;
}

const capitalACharCode = 'A'.charCodeAt(0);
const capitalZCharCode = 'Z'.charCodeAt(0);

const isUpper = (input: string, index: number) => {
    const charCode = input.charCodeAt(index);
    return capitalACharCode <= charCode && capitalZCharCode >= charCode;
};

const toKebabCase = (camelCased: string) => {
    let kebabCased = '';
    for (let i = 0; i < camelCased.length; i++) {
        const prevUpperCased = i > 0 ? isUpper(camelCased, i - 1) : true;
        const currentUpperCased = isUpper(camelCased, i);
        const nextUpperCased = i < camelCased.length - 1 ? isUpper(camelCased, i + 1) : true;
        if (!prevUpperCased && currentUpperCased || currentUpperCased && !nextUpperCased) {
            kebabCased += '-';
            kebabCased += camelCased[i].toLowerCase();
        } else {
            kebabCased += camelCased[i];
        }
    }
    return kebabCased;
};

const flattenContents = (contents: (ContentType | Array<ContentType>)[]): ContentType[] => {
    const results: ContentType[] = [];

    for (const content of contents) {
        if (
            content instanceof RenderNode ||
            content instanceof TextNode
        ) {
            results.push(content);
        } else if (Array.isArray(content)) {
            results.push(...flattenContents(content as Array<ContentType | Array<ContentType>>));
        } else {
            results.push('' + content);
        }
    }

    return results;
}

// Node for unescaped text
export class TextNode implements JSX.IRenderNode {
    constructor(readonly contents: string) { }

    toDom(): Text | HTMLElement {
        return document.createTextNode(this.contents);
    }

    toString(): string {
        return this.contents;
    }
}

export class RenderNode implements JSX.IRenderNode {
    constructor(
        readonly tagName: string,
        readonly attributes: Attributes | undefined,
        readonly children: ContentType[],
    ) { }

    toDom(): Text | HTMLElement {
        const el = document.createElement(this.tagName);

        for (const [attr, val] of Object.entries(this.attributes ?? {})) {
            // @ts-ignore
            el[attr] = val;
        }

        for (const child of this.children) {
            let childEl: Text | HTMLElement;
            if (typeof child === 'string') {
                childEl = document.createTextNode(child);
            } else {
                childEl = child.toDom();
            }

            el.appendChild(childEl);
        }

        return el;
    }
}

export function createElement(
    name: string | CustomElementHandler,
    attributes: Attributes | undefined,
    ...rawContents: (ContentType | Array<ContentType>)[]
): JSX.IRenderNode {
    let contents: (ContentType | Array<ContentType>)[] = rawContents;
    if (attributes && attributes['dangerousInnerHtml']) {
        // Overwrite the contents with the given html
        contents = [new TextNode('' + attributes['dangerousInnerHtml'])];
        delete attributes['dangerousInnerHtml'];
    }

    if (typeof name === 'function') {
        return name(attributes, flattenContents(contents));
    } else {
        const tagName = toKebabCase(name);
        const node = new RenderNode(
            tagName,
            attributes,
            flattenContents(contents),
        );
        return node;
    }
}
