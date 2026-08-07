/** @type {import("prettier").Config} */
const prettierConfig = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default prettierConfig;
