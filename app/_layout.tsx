
import '../global.css';
import { ThemeProvider } from '../src/context/ThemeContext';

export default function RootLayout({ children }) {
	return <ThemeProvider>{children}</ThemeProvider>;
}
