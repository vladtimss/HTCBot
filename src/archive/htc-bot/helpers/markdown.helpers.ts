const fs = require('fs').promises;

/**
 * Получаем готовое сообщение из файла
 * @param filePath
 */
export const getMarkdownMessageHelper = async (filePath) => {
    try {
        return await fs.readFile(filePath, {encoding: 'utf-8'});
    } catch (error) {
        console.error('Error reading the markdown file:', error);
        return 'An error occurred.';
    }
}

/**
 * Делаем текст жирным
 * @param text
 */
export const transformTextToBoldHelper = (text) => `*${text}*`;

/**
 * Делаем текст курсивом
 * @param text
 */
export const transformTextToItalicHelper = (text) => `_${text}_`;

/**
 * Создает ссылку
 * @param text
 * @param url
 */
export const wrapInMarkdownLink = (text, url) => `[${text}](${url})`;

