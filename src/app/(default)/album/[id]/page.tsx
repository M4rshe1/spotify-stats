const Page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  return <div>Album {id}</div>;
};

export default Page;
