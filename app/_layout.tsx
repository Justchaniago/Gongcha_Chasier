
import '../global.css';
import type { PropsWithChildren } from 'react';
import BiegeBlurBackground from '../src/components/BiegeBlurBackground';

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<BiegeBlurBackground>{children}</BiegeBlurBackground>
	);
}
