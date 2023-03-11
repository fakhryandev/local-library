const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");

const async = require("async");
const { body, validationResult } = require("express-validator");

const moment = require("moment");

exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
    .populate("book")
    .exec((err, list_bookinstances) => {
      if (err) {
        return next(err);
      }

      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }

      res.render("bookinstance_detail", {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,
      });
    });
};

exports.bookinstance_delete_get = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }

      if (bookinstance == null) {
        res.redirect("/catalog/bookinstances");
      }

      res.render("bookinstance_delete", {
        title: "Delete Book Instances",
        bookinstance,
      });
    });
};

exports.bookinstance_delete_post = (req, res, next) => {
  BookInstance.findById(req.body.bookinstanceid).exec((err, bookinstance) => {
    if (err) {
      return next(err);
    }

    if (bookinstance.status != "Available") {
      res.render("bookinstance_delete", {
        title: "Delete Book Instances",
        bookinstance,
      });

      return;
    }

    BookInstance.findByIdAndRemove(req.body.bookinstanceid, (err) => {
      if (err) {
        return next(err);
      }

      res.redirect("/catalog/bookinstances");
    });
  });
};

exports.bookinstance_create_get = (req, res) => {
  Book.find({}, "title").exec((err, books) => {
    if (err) {
      return next(err);
    }

    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};

exports.bookinstance_create_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  (req, res, next) => {
    const errors = validationResult(req);

    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }

        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance,
        });
      });

      return;
    }

    bookinstance.save((err) => {
      if (err) {
        return next(err);
      }

      res.redirect(bookinstance.url);
    });
  },
];

exports.bookinstance_update_get = (req, res, next) => {
  async.parallel(
    {
      bookinstance(callback) {
        BookInstance.findById(req.params.id).populate("book").exec(callback);
      },
      books(callback) {
        Book.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      if (results.bookinstance == null) {
        const err = new Error("Book copy not found");
        err.status = 404;

        return next(err);
      }

      res.render("bookinstance_form", {
        title: `Update: ${results.bookinstance.book.title}`,
        book_list: results.books,
        bookinstance: results.bookinstance,
        selected_book: results.bookinstance.book._id,
        moment,
      });
    }
  );
};

exports.bookinstance_update_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status", "Status must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  (req, res, next) => {
    const errors = validationResult(req);

    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      async.parallel(
        {
          bookinstance(callback) {
            BookInstance.findById(req.params.id)
              .populate("book")
              .exec(callback);
          },
          books(callback) {
            Book.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }

          res.render("bookinstance_form", {
            title: `Update: ${results.bookinstance.book.title}`,
            book_list: results.books,
            bookinstance: results.bookinstance,
            selected_book: results.bookinstance.book._id,
            moment,
          });
        }
      );
    }

    BookInstance.findByIdAndUpdate(
      req.params.id,
      bookinstance,
      {},
      (err, thebookinstance) => {
        if (err) {
          return next(err);
        }

        res.redirect(thebookinstance.url);
      }
    );
  },
];
