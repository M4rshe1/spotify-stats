import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import type { Session } from "@/server/better-auth/config";
import { getSession } from "@/server/better-auth/server";

export type WithAuthProps = {
    session: Session;
    searchParams: Record<string, string | string[]>;
    params: Record<string, string>;
};

type PageProps = {
    params?: Promise<Record<string, string>>;
    searchParams?: Promise<Record<string, string | string[]>>;
};

export const withAuth = <P extends object>(
    WrappedComponent: ComponentType<P & WithAuthProps>,
    reverse?: boolean,
) => {
    const WithAuth = async (props: PageProps) => {
        const [params, searchParams, session] = await Promise.all([
            props.params ?? Promise.resolve({}),
            props.searchParams ?? Promise.resolve({}),
            getSession(),
        ]);

        if (!session && !reverse) {
            redirect("/auth/login");
        }

        if (session && reverse) {
            redirect("/");
        }

        return (
            <WrappedComponent
                {...(props as any)}
                session={session}
                params={params || {}}
                searchParams={searchParams || {}}
            />
        );
    };

    return WithAuth;
};

export const withAdmin = <P extends object>(
    WrappedComponent: ComponentType<P>,
) => {
    const WithAdmin = async (props: PageProps) => {
        const [params, searchParams, session] = await Promise.all([
            props.params ?? Promise.resolve({}),
            props.searchParams ?? Promise.resolve({}),
            getSession(),
        ]);

        if (!session || session?.user?.role !== "admin") {
            redirect("/auth/login");
        }

        return (
            <WrappedComponent
                {...(props as any)}
                session={session}
                params={params || {}}
                searchParams={searchParams || {}}
            />
        );
    };

    return WithAdmin;
};
