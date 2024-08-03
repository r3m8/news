function escapeXml(str) {
    return str.replace(/&/g, '&amp;');
}

export default escapeXml;