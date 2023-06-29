import React, { useEffect, useState } from "react";
import { ActionIcon, Badge, Button, Card, Divider, Modal, ScrollArea, Text, Textarea, Tooltip } from "@mantine/core";
import axios from "axios";
import { indexerHost } from "@/config";
import { IndexedDocument } from "@/utility/utility";
import { forEach, map } from "lodash";
import { useSetState } from "react-use";
import DateInfo from "@/components/pages/ChatbotPage/DateInfo";
import { useIndexedDocs } from "@/states/states";
import { IconArrowDown, IconArrowUp, IconTrash } from "@tabler/icons-react";
import DocUpdate from "@/components/pages/ChatbotPage/DocUpdate";
import classNames from "classnames";

type DocsModalProps = {
  opened: boolean;
  close: () => any;
};

const DocsModal = ({ opened, close }: DocsModalProps) => {
  const [docs, setDocs] = useState<IndexedDocument[]>([]);
  const [fileExtensions, setFileExtensions] = useSetState<Record<string, string>>({});
  const [loadings, setLoadings] = useSetState<Record<string, boolean>>({});
  const [removeIndexLoadings, setRemoveIndexLoadings] = useSetState<Record<string, boolean>>({});
  const [, setIndexedDocs] = useIndexedDocs();
  const [currentDocId, setCurrentDocId] = useState<string>();

  const updateDocs = (first?: boolean) => {
    axios
      .get(`${indexerHost}/api/docs`)
      .then(({ data }) => {
        const docs = data.data as IndexedDocument[];

        setDocs(docs);
        setIndexedDocs(docs.filter(v => v.isIndexed).map(v => v.doc_id));

        if (first) {
          forEach(docs, doc => {
            setFileExtensions({
              [doc.doc_id]: doc.extensions.join(","),
            });
          });
        }
      })
      .catch(() => {});
  };
  const startTrain = (docId: string) => {
    setLoadings({
      [docId]: true,
    });

    axios
      .post(`${indexerHost}/api/index`, {
        doc_id: docId,
        extensions: fileExtensions[docId]
          .split(",")
          .map(v => v.trim())
          .filter(v => v.length > 0)
          .map(v => {
            if (!v.startsWith(".")) {
              return "." + v;
            }
            return v;
          }),
      })
      .then(() => {
        updateDocs();
      })
      .finally(() => {
        setLoadings({
          [docId]: false,
        });
      });
  };
  const removeIndex = (docId: string) => {
    setRemoveIndexLoadings({
      [docId]: true,
    });

    axios
      .post(`${indexerHost}/api/remove-index`, {
        doc_id: docId,
      })
      .then(() => {
        updateDocs();
      })
      .finally(() => {
        setRemoveIndexLoadings({
          [docId]: false,
        });
      });
  };

  useEffect(() => {
    if (opened) {
      updateDocs(true);
    }
  }, [opened]);

  return (
    <>
      <Modal
        centered={true}
        opened={opened}
        onClose={close}
        title="Private Document Management"
        scrollAreaComponent={ScrollArea.Autosize}
        size={"lg"}
      >
        <div className={"flex flex-col gap-2"}>
          {map(docs, (doc, index) => {
            return (
              <Card key={index}>
                <div
                  className={classNames("flex flex-row gap-2 items-center", {
                    "opacity-20": currentDocId && currentDocId !== doc.doc_id,
                  })}
                >
                  <div className={"flex-grow"}>
                    <Badge className={"rounded"} variant={"outline"}>
                      {doc.doc_id}
                    </Badge>
                    <Textarea
                      value={fileExtensions[doc.doc_id]}
                      label={"File extensions:"}
                      placeholder={".txt,.md,.html,.js,..."}
                      minRows={1}
                      autosize={true}
                      onChange={e => {
                        setFileExtensions({
                          [doc.doc_id]: e.target.value,
                        });
                      }}
                    />
                    <div className={"flex items-center gap-1 justify-center"}>
                      <div className={"flex-grow"}>
                        <DateInfo
                          message={
                            {
                              date: new Date(doc.indexAt),
                            } as any
                          }
                        />
                      </div>
                      <div
                        className={"flex flex-row items-center gap-1 hover:text-blue-500 cursor-pointer"}
                        onClick={() => {
                          if (currentDocId === doc.doc_id) {
                            setCurrentDocId("");
                          } else {
                            setCurrentDocId(doc.doc_id);
                          }
                        }}
                      >
                        <Text size={"xs"}>Show files</Text>
                        {currentDocId !== doc.doc_id ? (
                          <IconArrowDown size={"1.25rem"} />
                        ) : (
                          <IconArrowUp size={"1.25rem"} />
                        )}
                      </div>
                    </div>
                  </div>
                  <Divider orientation={"vertical"} />
                  <div>
                    <div className={"flex flex-row items-center gap-2"}>
                      <Tooltip label={"Start training NullGPT to be able to interact with this document."}>
                        <Button
                          size={"xs"}
                          className={"w-24"}
                          color={doc.isIndexed ? "blue" : "green"}
                          loading={loadings[doc.doc_id]}
                          onClick={() => startTrain(doc.doc_id)}
                        >
                          {doc.isIndexed ? "Retraining" : "Train"}
                        </Button>
                      </Tooltip>
                      <Tooltip label={"Remove the index of this document."}>
                        <ActionIcon
                          loading={removeIndexLoadings[doc.doc_id]}
                          onClick={() => removeIndex(doc.doc_id)}
                          size={"xs"}
                          variant={"outline"}
                          color={"red"}
                        >
                          <IconTrash />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {currentDocId === doc.doc_id && (
                  <>
                    <div className={"pt-2"}>
                      <Divider className={"mb-2"} />
                      <DocUpdate docId={doc.doc_id} />
                    </div>
                    <Divider className={"mt-2"} />
                    <Button
                      className={"w-full border-0"}
                      variant={"default"}
                      size={"xs"}
                      onClick={() => setCurrentDocId("")}
                    >
                      <Text className={"opacity-80"}>Close edit (!!! ignore unsaved)</Text>
                    </Button>
                  </>
                )}
              </Card>
            );
          })}
        </div>
        {docs.length === 0 && (
          <div>
            <div>Please visit the following address:</div>
            <a href={"https://github.com/nullmastermind/nullgpt-indexer"} target={"_blank"}>
              https://github.com/nullmastermind/nullgpt-indexer
            </a>
            <div>
              This is where you will find the necessary information and resources to set up your private document.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DocsModal;
