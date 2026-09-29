/**
 * The handful of values every other slice of the generator needs.
 *
 * `ROOT` is resolved from this file, which sits one directory deeper than the
 * entry point -- hence `../..`.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ORIGIN = 'https://office.inled.es';
export const REPO = 'https://github.com/InledGroup/newoffice';
export const SITE_NAME = 'Online Document Editor';

/**
 * The two repositories the footer credits, and asks a star for.
 *
 * `VENDOR_REPO` is the people who actually built the editors this site embeds
 * (ONLYOFFICE, Ascensio System SIA). `UPSTREAM_REPO` is the project this one is
 * forked from -- the original of this site, not its deployment. They are
 * different debts and the footer states them separately; collapsing them into
 * "built with open source" credits neither.
 */
export const VENDOR_REPO = 'https://github.com/ONLYOFFICE/web-apps';
export const UPSTREAM_REPO = 'https://github.com/ranuts/document';
