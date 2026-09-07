import TopicPage from '@/components/TopicPage';

export default function TopicPageContainer({ params }: { params: { topicId: string } }) {
  return (
    <main>
      <TopicPage topicId={params.topicId} />
    </main>
  );
}