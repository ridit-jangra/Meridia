export const pypiBridge = {
  async getPackagesList(query: string): Promise<any[]> {
    try {
      const packages = [{}];
      return packages;
    } catch (error) {
      console.error("PyPI search failed:", error);
      return [];
    }
  },
};
