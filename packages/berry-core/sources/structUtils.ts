import chalk = require('chalk');

import {createHmac}                          from 'crypto';

import {Configuration}                       from './Configuration';
import * as miscUtils                        from './miscUtils';
import {Ident, Descriptor, Locator, Package} from './types';

// @ts-ignore
const ctx = new chalk.constructor({enabled: true});

function color(configuration: Configuration, text: string, color: string) {
  if (configuration.enableColors) {
    return ctx.keyword(color)(text);
  } else {
    return text;
  }
}

export function makeHash(... args: Array<string | null>): string {
  const hmac = createHmac(`sha512`, `berry`);

  for (const arg of args)
    hmac.update(arg ? arg : ``);

  return hmac.digest(`hex`);
}

export function makeIdent(scope: string | null, name: string): Ident {
  return {identHash: makeHash(scope, name), scope, name};
}

export function makeDescriptor(ident: Ident, range: string): Descriptor {
  return {identHash: ident.identHash, scope: ident.scope, name: ident.name, descriptorHash: makeHash(ident.identHash, range), range};
}

export function makeLocator(ident: Ident, reference: string): Locator {
  return {identHash: ident.identHash, scope: ident.scope, name: ident.name, locatorHash: makeHash(ident.identHash, reference), reference};
}

export function convertToIdent(source: Descriptor | Locator | Package): Ident {
  return {identHash: source.identHash, scope: source.scope, name: source.name};
}

export function convertDescriptorToLocator(descriptor: Descriptor): Locator {
  return {identHash: descriptor.identHash, scope: descriptor.scope, name: descriptor.name, locatorHash: descriptor.descriptorHash, reference: descriptor.range};
}

export function convertLocatorToDescriptor(locator: Locator): Descriptor {
  return {identHash: locator.identHash, scope: locator.scope, name: locator.name, descriptorHash: locator.locatorHash, range: locator.reference};
}

export function convertPackageToLocator(pkg: Package): Locator {
  return {identHash: pkg.identHash, scope: pkg.scope, name: pkg.name, locatorHash: pkg.locatorHash, reference: pkg.reference};
}

export function virtualizeDescriptor(descriptor: Descriptor, entropy: string): Descriptor {
  if (entropy.includes(`#`))
    throw new Error(`Invalid entropy`);

  return makeDescriptor(descriptor, `virtual:${entropy}#${descriptor.range}`);
}

export function virtualizePackage(pkg: Package, entropy: string): Package {
  if (entropy.includes(`#`))
    throw new Error(`Invalid entropy`);

  return {
    ... makeLocator(pkg, `virtual:${entropy}#${pkg.reference}`),

    binaries: new Map(pkg.binaries),
    dependencies: new Map(pkg.dependencies),
    peerDependencies: new Map(pkg.peerDependencies),
  };
}

export function isVirtualDescriptor(descriptor: Descriptor): boolean {
  return descriptor.range.startsWith(`virtual:`);
}

export function isVirtualLocator(locator: Locator): boolean {
  return locator.reference.startsWith(`virtual:`);
}

export function devirtualizeDescriptor(descriptor: Descriptor): Descriptor {
  if (!isVirtualDescriptor(descriptor))
    throw new Error(`Not a virtual descriptor`);

  return makeDescriptor(descriptor, descriptor.range.replace(/^.*#/, ``));
}

export function areIdentsEqual(a: Ident, b: Ident) {
  return a.identHash === b.identHash;
}

export function areDescriptorsEqual(a: Descriptor, b: Descriptor) {
  return a.descriptorHash === b.descriptorHash;
}

export function areLocatorsEqual(a: Locator, b: Locator) {
  return a.locatorHash === b.locatorHash;
}

export function parseIdent(string: string): Ident {
  const match = string.match(/^(?:@([^\/]+?)\/)?([^\/]+?)$/);

  if (!match)
    throw new Error(`Parse error (${string})`);

  const [, scope, name] = match;
  return makeIdent(scope, name);
}

export function parseDescriptor(string: string): Descriptor {
  const match = string.match(/^(?:@([^\/]+?)\/)?([^\/]+?)(?:@(.+))?$/);

  if (!match)
    throw new Error(`Parse error (${string})`);

  let [, scope, name, range] = match;

  if (!range)
    range = `unknown`;

  return makeDescriptor(makeIdent(scope, name), range);
}

export function parseLocator(string: string): Locator {
  const match = string.match(/^(?:@([^\/]+?)\/)?([^\/]+?)@(.+)$/);

  if (!match)
    throw new Error(`Parse error (${string})`);

  let [, scope, name, reference] = match;
  return makeLocator(makeIdent(scope, name), reference);
}

export function requirableIdent(ident: Ident) {
  if (ident.scope) {
    return `@${ident.scope}/${ident.name}`;
  } else {
    return `${ident.name}`;
  }
}

export function stringifyIdent(ident: Ident) {
  if (ident.scope) {
    return `@${ident.scope}/${ident.name}`;
  } else {
    return `${ident.name}`;
  }
}

export function stringifyDescriptor(descriptor: Descriptor) {
  if (descriptor.scope) {
    return `@${descriptor.scope}/${descriptor.name}@${descriptor.range}`;
  } else {
    return `${descriptor.name}@${descriptor.range}`;
  }
}

export function stringifyLocator(locator: Locator) {
  if (locator.scope) {
    return `@${locator.scope}/${locator.name}@${locator.reference}`;
  } else {
    return `${locator.name}@${locator.reference}`;
  }
}

export function prettyIdent(configuration: Configuration, ident: Ident) {
  if (ident.scope) {
    return `${color(configuration, `@${ident.scope}/`, `orange`)}${color(configuration, ident.name, `green`)}`;
  } else {
    return `${color(configuration, ident.name, `green`)}`;
  }
}

export function prettyRange(configuration: Configuration, range: string) {
  return `${color(configuration, range, `blue`)}`;
}

export function prettyDescriptor(configuration: Configuration, descriptor: Descriptor) {
  return `${prettyIdent(configuration, descriptor)}@${prettyRange(configuration, descriptor.range)}`;
}

export function prettyReference(configuration: Configuration, reference: string) {
  return `${color(configuration, reference, `violet`)}`;
}

export function prettyLocator(configuration: Configuration, locator: Locator) {
  return `${prettyIdent(configuration, locator)}@${prettyReference(configuration, locator.reference)}`;
}

export function sortDescriptors(descriptors: Iterable<Descriptor>) {
  return miscUtils.sortMap(descriptors, [
    descriptor => stringifyDescriptor(descriptor),
  ]);
}