import test from 'node:test';
import assert from 'node:assert/strict';
import { Marked } from 'marked';
import {
  formatDimensions,
  formatWeight,
  measurementValue,
  measurementUnit,
} from '../src/utils/helpers/format.js';
import { fileDataUrl } from '../src/utils/helpers/storage-files.js';
import { getList, getId } from '../src/utils/helpers/response.js';
import { flattenCategories } from '../src/utils/helpers/categories.js';

const dimensions = { width: { value: 20, unit: 'CM' }, height: { value: 0.5, unit: 'M' } };

test('formats the actual nested alibaba_backend dimensions', () => {
  const result = formatDimensions(dimensions);
  assert.match(result, /۲۰ سانتی‌متر/);
  assert.match(result, /۰.۵ متر/);
  assert.doesNotMatch(result, /object|undefined|NaN/);
});

test('supports numeric measurements with a shared fallback unit', () => {
  assert.equal(
    formatDimensions({ width: 20, height: 30, unit: 'CM' }),
    '۲۰ سانتی‌متر × ۳۰ سانتی‌متر',
  );
  assert.equal(formatWeight({ value: 250, unit: 'G' }), '۲۵۰ گرم');
  assert.equal(formatDimensions(null), 'ثبت نشده');
  assert.equal(formatWeight({}), 'ثبت نشده');
});

test('normalizes measurements for seller form payloads', () => {
  assert.equal(measurementValue(dimensions.width), 20);
  assert.equal(measurementUnit(dimensions.height), 'M');
  assert.equal(measurementValue({ amount: 300 }), 300);
  assert.equal(measurementValue(''), null);
});

test('converts Mongo Buffer JSON into an image data URL', () => {
  const file = { contentType: 'image/png', data: { type: 'Buffer', data: [137, 80, 78, 71] } };
  assert.equal(fileDataUrl(file), 'data:image/png;base64,iVBORw==');
  assert.equal(
    fileDataUrl({ contentType: 'image/png', data: 'iVBORw==' }),
    'data:image/png;base64,iVBORw==',
  );
  assert.equal(
    fileDataUrl({ contentType: 'image/png', data: { 0: 137, 1: 80, 2: 78, 3: 71 } }),
    'data:image/png;base64,iVBORw==',
  );
  assert.equal(fileDataUrl({ contentType: 'application/json', data: {} }), '');
});

test('unwraps backend envelopes and ObjectId references', () => {
  assert.deepEqual(getList({ data: { body: { data: [{ _id: 'a' }] } } }), [{ _id: 'a' }]);
  assert.deepEqual(getList({ data: { body: [{ _id: 'b' }] } }), [{ _id: 'b' }]);
  assert.equal(getId({ $oid: '6ae991e8585a9da2da49e0be' }), '6ae991e8585a9da2da49e0be');
});

test('flattens category trees without losing parent relationships', () => {
  const result = flattenCategories([
    { _id: 'root', name: 'Root', children: [{ _id: 'child', name: 'Child' }] },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[1].parent_id, 'root');
});

test('renders the supplied GNSS description as Markdown HTML', () => {
  const marked = new Marked({ gfm: true, async: false });
  const html = marked.parse('## GNSS Receiver\nگیرنده GNSS چندفرکانسه');
  assert.match(html, /<h2>GNSS Receiver<\/h2>/);
  assert.match(html, /<p>گیرنده GNSS چندفرکانسه<\/p>/);
});
