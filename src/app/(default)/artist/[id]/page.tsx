import { withAuth } from "@/lib/hoc-pages";

const Page = withAuth(async () => {
  return <div>Artist</div>;
});

export default Page;
