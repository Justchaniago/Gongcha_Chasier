

import '../global.css';
import { ThemeProvider } from '../src/context/ThemeContext';
import BiegeBlurBackground from '../src/components/BiegeBlurBackground';

export default function RootLayout({ children }) {
	return (
		<ThemeProvider>
			<BiegeBlurBackground>{children}</BiegeBlurBackground>
		</ThemeProvider>
	);
}
