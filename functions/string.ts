const clean = (path: string): string => path.replace(/^\/|\.html$/gi, "");

export { clean };
