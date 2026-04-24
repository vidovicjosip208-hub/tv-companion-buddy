interface ContentDetailsProps {
  title?: string;
  genre: string;
  year: string;
  episodes?: string;
  rating: string;
  description: string;
}

const ContentDetails = ({ genre, year, episodes, rating, description }: ContentDetailsProps) => {
  return (
    <div className="px-12 mt-4 mb-6 max-w-2xl" style={{ height: "80px", overflow: "hidden" }}>
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="text-white font-medium">{genre}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground">{year}</span>
        {episodes && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground">{episodes}</span>
          </>
        )}
        <span className="text-muted-foreground">•</span>
        <span className="text-white font-medium">{rating}</span>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{description}</p>
    </div>
  );
};

export default ContentDetails;
