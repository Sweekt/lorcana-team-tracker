import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
    if (req.nextUrl.pathname.startsWith('/admin')) {
        const basicAuth = req.headers.get('authorization');

        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1];
            const [user, pwd] = atob(authValue).split(':');

            if (user === 'admin' && pwd === (process.env.ADMIN_PASSWORD || 'lorcana')) {
                return NextResponse.next();
            }
        }

        return new NextResponse('Accès non autorisé', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Zone d\'administration sécurisée"',
            },
        });
    }
}

export const config = {
    matcher: ['/admin/:path*'],
};