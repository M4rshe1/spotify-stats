const Page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  return <div>Track {id}</div>;
};

export default Page;