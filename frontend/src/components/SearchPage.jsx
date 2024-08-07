import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import FinishedRating from "./FinishedRating";
import { calculateAverageRating } from "../functions/calculateAverageRating";
import { FaSearch } from "react-icons/fa";

export default function SearchPage() {
  const [combinedData, setCombinedData] = useState([]);
  const [search, setSearch] = useState("");

  console.log(combinedData);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchTitle = queryParams.get("title");

  const navigate = useNavigate();

  console.log(searchTitle);

  useEffect(() => {
    async function getData() {
      const booksCollectionRef = collection(db, "books");
      const audioBooksCollectionRef = collection(db, "audioBooks");

      try {
        // Fetch books
        const booksData = await getDocs(booksCollectionRef);
        const filteredBooksData = booksData.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

        // Fetch audiobooks
        const audioBooksData = await getDocs(audioBooksCollectionRef);
        const filteredAudioBooksData = audioBooksData.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

        // Combine books and audiobooks into a single array
        const combinedData = [...filteredBooksData, ...filteredAudioBooksData];

        const filteredCombinedData = combinedData.filter((data) => {
          return data.title.toLowerCase().includes(searchTitle.toLowerCase());
        });

        // Set state for combined data
        setCombinedData(filteredCombinedData);
        setSearch(searchTitle);
      } catch (err) {
        console.error(err);
      }
    }

    getData();
  }, [searchTitle]);

  function handleSearch(e) {
    const title = e.target.value;
    setSearch(title);
    navigate(`?title=${title}`);
  }

  return (
    <div className="page-container">
      <div className="search-input-page-container">
        <FaSearch className="search-icon" />
        <input
          value={search}
          className="search-input"
          type="text"
          placeholder="Search title..."
          onChange={handleSearch}
        />
      </div>

      {combinedData && combinedData.length > 0 ? (
        combinedData.map((data, index) => {
          const averageRating = calculateAverageRating(data.reviews);

          return (
            <Link
              className="no-link"
              key={index}
              to={data.type === "Book" ? `/book/${data.id}` : `/audioBook/${data.id}`}
            >
              <div key={index} className="books-container">
                <img className="books-img" src={data.image} alt="" />

                <div className="books-container-info">
                  <h2 className="books-h2">{data.title}</h2>
                  <FinishedRating score={averageRating} size={25} />

                  {/* Add emotes here instead of a text like "price:" */}
                  <div style={{ marginTop: "10px" }}>
                    <p>{data.author}</p>
                    <p>{data.language}</p>
                    <p>Price: {data.price} kr</p>
                    <p>Type: {data.type}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })
      ) : (
        <h2 style={{ marginBottom: "1em", textAlign: "center" }}>No book with that title</h2>
      )}
    </div>
  );
}
