import { withAuth } from "@/lib/hoc-pages";

const Page = withAuth(async () => {
  return <div>Album</div>;
});

export default Page;
