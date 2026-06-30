import { DataProvider } from "./DataContext";

const DataLayer = ({ children }) => {
  return <DataProvider>{children}</DataProvider>;
};

export default DataLayer;
