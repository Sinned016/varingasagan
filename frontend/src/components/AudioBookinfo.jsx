import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../config/firebase";
import useAuthState from "./useAuthState";
import { Modal, Box, Typography } from "@mui/material";
import likeWhite from "../assets/icons/likeWhite.png";
import likeRed from "../assets/icons/likeRed.png";
import StarRating from "./StarRating";
import FinishedRating from "./FinishedRating";
import { calculateAverageRating } from "../functions/calculateAverageRating";
import { FaTimes, FaTrash } from "react-icons/fa";
import Review from "./Review";
import { CircleUserRound, Trash } from "lucide-react";
import { formatDistance, subDays } from "date-fns";
import { Button } from "./ui/button";

export default function Bookinfo() {
  let { id } = useParams();
  const [audioBookInfo, setAudioBookInfo] = useState();
  const { signedInUser, isAdmin } = useAuthState(); // Use the custom hook to get authentication state

  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewTitleError, setReviewTitleError] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewContentError, setReviewContentError] = useState("");
  const [reviewRatingError, setReviewRatingError] = useState("");
  const [open, setOpen] = useState(false);
  const [openDeleteReview, setOpenDeleteReview] = useState(false);
  const [reviewIdToDelete, setReviewIdToDelete] = useState(null);
  const [displayedReviews, setDisplayedReviews] = useState(5);
  const [reviewRating, setReviewRating] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [description, setDescription] = useState(true);

  // Trigger to do the useEffect again and fetch all data.
  const [submitTrigger, setSubmitTrigger] = useState(false);
  //Testing Timestamp, gonna use it later
  // const time = Timestamp.now();
  // console.log(time.toDate());

  useEffect(() => {
    async function getData() {
      const audioBookDocRef = doc(db, "audioBooks", id);
      try {
        const booksData = await getDoc(audioBookDocRef);

        if (booksData.exists()) {
          const data = booksData.data();
          setAudioBookInfo(data); // Set bookInfo state with the data of the document

          const averageRating = calculateAverageRating(data.reviews);

          setAverageRating(averageRating);
        } else {
          console.log("No such document!");
        }
      } catch (err) {
        console.error(err);
      }
    }
    getData();
  }, [id, submitTrigger]);

  function openModal(e) {
    e.preventDefault();

    if (!reviewTitle || reviewTitle.length < 3) {
      setReviewTitleError("Please provide a title for your review");
      return;
    } else {
      setReviewTitleError("");
    }

    if (!reviewContent) {
      setReviewContentError("Please provide your review before submitting");
      return;
    } else {
      setReviewContentError("");
    }

    if (reviewRating === 0) {
      setReviewRatingError("Please provide a rating before submitting");
      return;
    } else {
      setReviewRatingError("");
    }

    setOpen(true);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();

    const audioBookDocRef = doc(db, "audioBooks", id);
    const newTimestamp = Timestamp.now();

    const payloadData = {
      userId: signedInUser.uid,
      reviewId: `email-${signedInUser.email}-title-${reviewTitle}-timestamp-${newTimestamp}`,
      email: signedInUser.email,
      reviewTitle: reviewTitle,
      reviewContent: reviewContent,
      reviewRating: reviewRating,
      timestamp: newTimestamp,
      likes: [],
    };

    try {
      await updateDoc(audioBookDocRef, {
        reviews: arrayUnion(payloadData), // Add the new review to the existing reviews array
      });

      setReviewTitle("");
      setReviewContent("");
      setReviewRating(0);
      setOpen(false);
      setSubmitTrigger(!submitTrigger);
    } catch (err) {
      console.error(err);
    }
  }

  function handleCancelReview(e) {
    e.preventDefault();

    setReviewTitle("");
    setReviewContent("");
  }

  const handleShowMoreReviews = () => {
    setDisplayedReviews(displayedReviews + 5);
  };

  async function rateReview(e, reviewId, action) {
    e.preventDefault();

    const audioBookDocRef = doc(db, "audioBooks", id);
    //const newTimestamp = Timestamp.now();

    try {
      const bookSnapshot = await getDoc(audioBookDocRef);
      const bookData = bookSnapshot.data();

      const reviewIndex = bookData.reviews.findIndex(
        (review) => review.reviewId === reviewId
      );

      // The specific review the user has liked
      const review = bookData.reviews[reviewIndex];

      if (action === "like") {
        const userLiked = review.likes.includes(signedInUser.uid);

        if (!userLiked) {
          bookData.reviews[reviewIndex].likes.push(signedInUser.uid);
          await updateDoc(audioBookDocRef, {
            reviews: bookData.reviews,
          });
        } else {
          const userIndex = review.likes.indexOf(signedInUser.uid);
          bookData.reviews[reviewIndex].likes.splice(userIndex, 1);
          await updateDoc(audioBookDocRef, {
            reviews: bookData.reviews,
          });
        }
      }
      setSubmitTrigger(!submitTrigger);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteReviewModal(reviewId) {
    setReviewIdToDelete(reviewId);
    setOpenDeleteReview(true);
  }

  //Create a function that works with both audio books and books, now i have 2 functions which kinda looks the same.
  async function deleteReview() {
    if (isAdmin) {
      try {
        // Get a reference to the book document
        const audioBookDocRef = doc(db, "audioBooks", id);

        // Fetch the book document
        const audioBookDocSnap = await getDoc(audioBookDocRef);

        if (audioBookDocSnap.exists()) {
          const bookData = audioBookDocSnap.data();
          const reviews = bookData.reviews;

          // Find the review to remove
          const reviewToRemove = reviews.find(
            (review) => review.reviewId === reviewIdToDelete
          );

          if (reviewToRemove) {
            // Update the book document to remove the review from the array
            await updateDoc(audioBookDocRef, {
              reviews: arrayRemove(reviewToRemove),
            });

            console.log("Review deleted successfully");
          } else {
            console.log("Review not found");
          }
        } else {
          console.log("Book not found");
        }
      } catch (err) {
        console.error("Error deleting review: ", err);
      }
      setSubmitTrigger(!submitTrigger);
      setReviewIdToDelete(null);
      setOpenDeleteReview(false);
    }
  }

  return (
    <div className="sm:px-6 xl:px-0">
      {audioBookInfo ? (
        <div className=" p-6 sm:p-0 sm:pt-6">
          <div className="flex flex-col md:flex-row pb-10">
            <div className="mr-6 flex-shrink-0">
              <img
                className="w-full max-w-52 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                src={audioBookInfo.image}
                alt=""
              />

              <a
                href={audioBookInfo.linkToPurchase}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="mt-5 px-3 py-2 rounded text-white w-full mb-4 transform duration-200 hover:bg-red-500">
                  Köp ljudboken
                </Button>
              </a>
            </div>

            <div className="flex flex-col flex-grow">
              <h1 className="text-4xl font-semibold">{audioBookInfo.title}</h1>
              <div className="flex flex-row">
                <p className="mr-2">{audioBookInfo.author}</p>
                <p>{audioBookInfo.releaseDate}</p>
              </div>
              <p className="font-semibold text-lg">{audioBookInfo.price} kr</p>

              <div className="flex flex-row justify-evenly mt-4">
                <button
                  className={description && "font-semibold"}
                  onClick={() => setDescription(true)}
                >
                  Beskrivning
                </button>
                <button
                  className={!description && "font-semibold"}
                  onClick={() => setDescription(false)}
                >
                  Specifikationer
                </button>
              </div>

              <div className="border mt-2 border-muted-foreground"></div>

              {description && (
                <div className="mt-5">
                  <p>{audioBookInfo.description}</p>
                </div>
              )}

              {!description && (
                <div className="mt-5 flex flex-row justify-between">
                  <div>
                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Format:</p>
                      <p>{audioBookInfo.type}</p>
                    </div>
                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Språk:</p>
                      <p>{audioBookInfo.language}</p>
                    </div>

                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Uppläsare:</p>
                      <p>{audioBookInfo.reader}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Pris:</p>
                      <p>{audioBookInfo.price} kr</p>
                    </div>

                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Speltid:</p>
                      <p>{audioBookInfo.time}</p>
                    </div>

                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Storlek:</p>
                      <p>{audioBookInfo.size}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Utgivningsdatum:</p>
                      <p>{audioBookInfo.releaseDate}</p>
                    </div>
                    <div className="flex flex-row">
                      <p className="font-semibold mr-1">Utgivare:</p>
                      <p>{audioBookInfo.publisher}</p>
                    </div>
                  </div>
                </div>
              )}

              <div></div>
            </div>
          </div>

          <Review
            submitTrigger={submitTrigger}
            setSubmitTrigger={setSubmitTrigger}
            typeofBook="audioBook"
          />

          {audioBookInfo.reviews?.length > 0 && (
            <div className="">
              <h2 className="text-xl mb-2 font-bold">Recensioner</h2>

              {/* Map over only the number of reviews specified by displayedReviews */}
              {audioBookInfo.reviews
                .slice(0, displayedReviews)
                .map((review, i) => {
                  return (
                    <div
                      className="border border-neutral-600 p-4 rounded-lg mb-4 bg-card relative"
                      key={i}
                    >
                      <div className="flex gap-4 mb-2">
                        {/* <div className="w-11 h-11 rounded-full bg-zinc-400">
                          
                        </div> */}
                        <div>
                          <CircleUserRound size={42} />
                        </div>
                        <div>
                          <p>{review.email}</p>
                          <div className="flex flex-row gap-2">
                            <FinishedRating
                              score={review.reviewRating}
                              size={16}
                            />
                            <div className="flex gap-1">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {formatDistance(
                                  subDays(review.timestamp.seconds * 1000, 0),
                                  new Date()
                                )}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground">
                                ago
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg  font-semibold">
                        {review.reviewTitle}
                      </h3>
                      <p>{review.reviewContent}</p>

                      <div className="">
                        {isAdmin && (
                          <Trash
                            className="absolute top-0 right-0 m-4 cursor-pointer"
                            onClick={() =>
                              handleDeleteReviewModal(review.reviewId)
                            }
                            size={22}
                          ></Trash>
                        )}

                        {/* System for liking reviews, it's done and works but idk if i want it, if I do then change the icons. */}
                        {/* <p className="total-reviews">
                        {review.likes && review.likes.length > 0
                          ? review.likes.length
                          : ""}
                      </p>

                      {signedInUser ? (
                        <div
                          className={
                            review.likes &&
                            review.likes.includes(signedInUser?.uid)
                              ? "liked"
                              : "unliked"
                          }
                          onClick={(e) =>
                            rateReview(e, review.reviewId, "like")
                          }
                        >
                          {review.likes &&
                          review.likes.includes(signedInUser.uid) ? (
                            <img className="rate-icon" src={likeWhite} alt="" />
                          ) : (
                            <img className="rate-icon" src={likeRed} alt="" />
                          )}
                        </div>
                      ) : (
                        ""
                      )} */}
                      </div>
                    </div>
                  );
                })}
              {/* Button to show more reviews */}
              {audioBookInfo.reviews.length > displayedReviews && (
                <button
                  onClick={handleShowMoreReviews}
                  className="border border-muted-foreground p-2 rounded-sm bg-slate-100 hover:bg-slate-200"
                >
                  Visa mer
                </button>
              )}
            </div>
          )}

          <div>
            <Modal
              open={openDeleteReview}
              onClose={() => setOpenDeleteReview(false)}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 400,
                  boxShadow: 24,

                  overflow: "auto",
                  outline: "none",
                }}
                className="bg-slate-100 rounded-lg p-6"
              >
                <div>
                  <h1 className="text-lg font-bold mb-2">Ta bort recension?</h1>
                  <p className="text-sm  mb-4">
                    Är du säker på att du vill{" "}
                    <span className="font-semibold">ta bort</span> denna
                    recension?
                  </p>

                  <div className="modal-button-container">
                    <button
                      className="mb-2 modal-button rounded-lg bg-red-500 hover:bg-red-600 text-white transform duration-300"
                      onClick={deleteReview}
                    >
                      Ta bort
                    </button>
                    <button
                      className="modal-button rounded-lg bg-zinc-500 hover:bg-zinc-600 text-white transform duration-300"
                      onClick={() => {
                        setOpenDeleteReview(false);
                        setReviewIdToDelete(null);
                      }}
                    >
                      Nej
                    </button>
                  </div>

                  <FaTimes
                    className="cursor-pointer absolute top-0 right-0 m-4"
                    size="22"
                    onClick={() => setOpenDeleteReview(false)}
                  />
                </div>
              </Box>
            </Modal>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
