import { generateStylableRoot, processSource } from '@stylable/core-test-kit';
import { expect } from 'chai';
import postcss from 'postcss';

describe('@custom-selector', () => {
    it('collect custom-selectors', () => {
        const from = '/path/to/style.css';
        const result = processSource(
            `
            @custom-selector :--icon .root > .icon;
        `,
            { from }
        );

        expect(result.customSelectors[':--icon']).to.equal('.root > .icon');
    });

    it('expand custom-selector before process (reflect on ast)', () => {
        const from = '/path/to/style.css';
        const result = processSource(
            `
            @custom-selector :--icon .root > .icon;
            :--icon, .class {
                color: red;
            }
        `,
            { from }
        );

        const r = result.ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.root > .icon, .class');
        expect(result.classes.icon).to.contain({ _kind: 'class', name: 'icon' });
    });

    it('expand custom-selector before process (reflect on ast when not written)', () => {
        const from = '/path/to/style.css';
        const result = processSource(
            `
            @custom-selector :--icon .root > .icon;
        `,
            { from }
        );

        expect(result.classes.icon).to.contain({ _kind: 'class', name: 'icon' });
    });

    it('expand pseudo-element custom-selector in the owner context', () => {
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::root-icon{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--root-icon .root > .icon;

                        :--root-icon, .class {
                            color: red;
                        }
                    `
                }
            }
        });

        const r = ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.comp__root > .comp__icon');
    });

    it('expand custom-selector in pseudo-element in the owner context', () => {
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::root-icon::top{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--root-icon .root > .icon;
                        :import {
                            -st-from: "./child.st.css";
                            -st-default: Child;
                        }
                        :--root-icon, .class {
                            color: red;
                        }

                        .icon {
                            -st-extends: Child;
                        }
                    `
                },
                '/child.st.css': {
                    namespace: 'child',
                    content: `
                        .top {

                        }
                    `
                }
            }
        });

        const r = ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.comp__root > .comp__icon .child__top');
    });

    it('expand complex custom-selector in pseudo-element', () => {
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./comp.st.css";
                            -st-default: Comp;
                        }

                        Comp::class-icon{
                            color: blue;
                        }
                    `
                },
                '/comp.st.css': {
                    namespace: 'comp',
                    content: `
                        @custom-selector :--class-icon .icon, .class;
                    `
                }
            }
        });

        const r = ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.comp__root .comp__icon,.comp__root .comp__class');
    });

    it('expand custom-selector when there is global root', () => {
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./interface.st.css";
                            -st-default: Interface;
                        }
                        Interface::cc{
                            color: blue;
                        }
                    `
                },
                '/interface.st.css': {
                    namespace: 'interface',
                    content: `
                        :import{
                            -st-from: "./controls.st.css";
                            -st-default: Controls;
                        }
                        .root {
                            -st-global: ".xxx"
                        }
                        @custom-selector :--cc Controls;
                    `
                },
                '/controls.st.css': {
                    namespace: 'controls',
                    content: `
                        .root {
                        }
                    `
                }
            }
        });

        const r = ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.xxx .controls__root');
    });

    it('expand custom-selector that uses element in the same name', () => {
        const ast = generateStylableRoot({
            entry: '/entry.st.css',
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :import {
                            -st-from: "./interface.st.css";
                            -st-default: Interface;
                        }
                        Interface::cc{
                            color: blue;
                        }
                    `
                },
                '/interface.st.css': {
                    namespace: 'interface',
                    content: `
                        :import{
                            -st-from: "./controls.st.css";
                            -st-default: Controls;
                        }

                        @custom-selector :--cc .root Controls::cc;

                        .root {
                            -st-extends: Controls
                        }

                    `
                },
                '/controls.st.css': {
                    namespace: 'controls',
                    content: `
                        @custom-selector :--cc .root cc;
                    `
                }
            }
        });

        const r = ast.nodes![0] as postcss.Rule;
        expect(r.selector).to.equal('.interface__root .controls__root cc');
    });
});
