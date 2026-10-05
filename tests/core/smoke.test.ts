import { describe, expect, it } from 'vitest';
import {normalizePath} from "../../src/core/index.js";

describe('normalizePath', () => {
    it('đổi \\ thành /', () => {
        expect(normalizePath('a\\b\\c')).toBe('a/b/c');
        expect(normalizePath('src\\core\\index.ts')).toBe('src/core/index.ts');
    });

    it('bỏ ./ ở đầu đường dẫn', () => {
        expect(normalizePath('./src/index.ts')).toBe('src/index.ts');
        expect(normalizePath('.\\src\\index.ts')).toBe('src/index.ts');
        expect(normalizePath('./a/b/c')).toBe('a/b/c');
    });

    it('gộp nhiều dấu // liên tiếp thành một dấu /', () => {
        expect(normalizePath('a//b///c////d')).toBe('a/b/c/d');
        expect(normalizePath('src///core//utils.ts')).toBe('src/core/utils.ts');
    });

    it('xử lý rút gọn a/b/../c thành a/c', () => {
        expect(normalizePath('a/b/../c')).toBe('a/c');
        expect(normalizePath('a/b/c/../../d')).toBe('a/d');
        expect(normalizePath('src\\core\\..\\runtime\\file.ts')).toBe('src/runtime/file.ts');
    });

    describe('Edge cases (Các trường hợp biên)', () => {
        it('xử lý chuỗi rỗng ""', () => {
            expect(normalizePath('')).toBe('');
        });

        it('xử lý đường dẫn lùi cấp vượt quá thư mục gốc "../x"', () => {
            expect(normalizePath('../x')).toBe('../x');
            expect(normalizePath('..\\..\\x')).toBe('../../x');
        });

        it('xử lý đường dẫn tuyệt đối "/abs"', () => {
            expect(normalizePath('/abs')).toBe('/abs');
            expect(normalizePath('/abs/sub/../dir')).toBe('/abs/dir');
            expect(normalizePath('\\abs\\file')).toBe('/abs/file');
        });

        it('xử lý đường dẫn root đơn lẻ "/"', () => {
            expect(normalizePath('/')).toBe('/');
            expect(normalizePath('\\')).toBe('/');
        });
    });
});